import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ErrorCode, promote } from "../index.js";

type Project = {
  configFile: string;
  stateFile: string;
  storiesDir: string;
  derivedDir: string;
  draftsDir: string;
};

// Lays out an empty project (stories, derived specs, drafts) with a config whose
// layout points at those directories, so `promote` reads its locations from
// configuration (ENT-002). State is unseeded, so the first bound id for a prefix
// is number 1.
async function project(): Promise<Project> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-promote-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  const draftsDir = join(dir, "docs", "spec", "drafts");
  const domainModel = join(dir, "docs", "spec", "domain-model.md");
  await mkdir(join(draftsDir, "stories"), { recursive: true });
  await mkdir(join(draftsDir, "derived-specs"), { recursive: true });
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  const configFile = join(dir, ".ariadnerc.json");
  await writeFile(
    configFile,
    JSON.stringify({
      layout: {
        stories: { dir: storiesDir, prefix: "STR" },
        derivedSpecs: { dir: derivedDir },
        drafts: { dir: draftsDir },
        entities: { file: domainModel, prefix: "ENT" },
      },
    }),
    "utf8",
  );
  return {
    configFile,
    stateFile: join(dir, ".ariadne", "state.json"),
    storiesDir,
    derivedDir,
    draftsDir,
  };
}

async function writeDraft(
  draftsDir: string,
  subdir: string,
  name: string,
  body: string,
): Promise<string> {
  const path = join(draftsDir, subdir, name);
  await writeFile(path, body, "utf8");
  return path;
}

describe("finalizing drafts", () => {
  verifies(
    [
      SwTraceables.SW_017_FINALIZE_DRAFTS,
      ConTraceables.CON_014_EXHAUSTIVE_SUBSTITUTION,
      SysTraceables.SYS_005_SPEC_LIFECYCLE,
    ],
    () => {
      test("binds an id and moves a story draft into the stories directory", async () => {
        const p = await project();
        const from = await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-ab12cd34ef-promote.md",
          "Story STR-TMP-ab12cd34ef\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        expect(result.promoted).toEqual([
          {
            temporaryId: "STR-TMP-ab12cd34ef",
            boundId: "STR-001",
            from,
            to: join(p.storiesDir, "STR-001-promote.md"),
          },
        ]);
        const moved = await readFile(
          join(p.storiesDir, "STR-001-promote.md"),
          "utf8",
        );
        expect(moved).toBe("Story STR-001\n");
        await expect(readFile(from, "utf8")).rejects.toThrow();
      });

      test("recognizes the readable temporary forms — solo and author-postfixed", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-001-solo.md",
          "Spec SW-TMP-001\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-TS-002-author.md",
          "Spec CON-TMP-TS-002\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        const boundByTemporary = new Map(
          result.promoted.map((draft) => [draft.temporaryId, draft.boundId]),
        );
        expect(boundByTemporary.get("SW-TMP-001")).toBe("SW-001");
        expect(boundByTemporary.get("CON-TMP-TS-002")).toBe("CON-001");
        expect(
          await readFile(join(p.derivedDir, "SW-001-solo.md"), "utf8"),
        ).toBe("Spec SW-001\n");
        expect(
          await readFile(join(p.derivedDir, "CON-001-author.md"), "utf8"),
        ).toBe("Spec CON-001\n");
      });

      test("a temporary id that is a string-prefix of another is substituted without corrupting the longer one", async () => {
        const p = await project();
        // The two temporary ids share a prefix: `SW-TMP-1` is the head of `SW-TMP-10`.
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-1-low.md",
          "low\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-10-high.md",
          "high\n",
        );
        // An existing spec references the longer id; the shorter id's substitution
        // must not rewrite a substring of it.
        await writeFile(
          join(p.derivedDir, "SW-009-ref.md"),
          "See SW-TMP-10 and SW-TMP-1.\n",
          "utf8",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        const boundByTemporary = new Map(
          result.promoted.map((draft) => [draft.temporaryId, draft.boundId]),
        );
        const boundShort = boundByTemporary.get("SW-TMP-1");
        const boundLong = boundByTemporary.get("SW-TMP-10");
        expect(
          await readFile(join(p.derivedDir, "SW-009-ref.md"), "utf8"),
        ).toBe(`See ${boundLong} and ${boundShort}.\n`);
      });

      test("substitutes the temporary id in an already-promoted spec and an unpromoted draft", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-deadbeef01-scan.md",
          "Spec SW-TMP-deadbeef01\n",
        );
        // An already-promoted spec that references the draft being promoted.
        await writeFile(
          join(p.derivedDir, "SW-009-existing.md"),
          "See SW-TMP-deadbeef01 for details.\n",
          "utf8",
        );
        // A draft not promoted in this run that also references it.
        const unpromoted = await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-cafe123456-rule.md",
          "Relates to SW-TMP-deadbeef01.\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          drafts: ["SW-TMP-deadbeef01"],
        });

        expect(result.promoted[0]?.boundId).toBe("SW-001");
        expect(
          await readFile(join(p.derivedDir, "SW-001-scan.md"), "utf8"),
        ).toBe("Spec SW-001\n");
        expect(
          await readFile(join(p.derivedDir, "SW-009-existing.md"), "utf8"),
        ).toBe("See SW-001 for details.\n");
        // The unpromoted draft now points at the bound id and is still a draft.
        expect(await readFile(unpromoted, "utf8")).toBe("Relates to SW-001.\n");
      });

      test("finalizes all pending drafts when none are named", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-1111111111-a.md",
          "a\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-2222222222-b.md",
          "b\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        expect(result.promoted.map((entry) => entry.boundId).sort()).toEqual([
          "STR-001",
          "SW-001",
        ]);
      });

      test("moves a promoted draft whatever its filename extension", async () => {
        const p = await project();
        const from = await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-001-note.txt",
          "Spec SW-TMP-001\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        expect(result.promoted[0]?.boundId).toBe("SW-001");
        expect(
          await readFile(join(p.derivedDir, "SW-001-note.txt"), "utf8"),
        ).toBe("Spec SW-001\n");
        await expect(readFile(from, "utf8")).rejects.toThrow();
      });

      test("returns nothing when there are no pending drafts", async () => {
        const p = await project();

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
        });

        expect(result.promoted).toEqual([]);
      });
    },
  );
});

describe("atomic finalization", () => {
  verifies(ConTraceables.CON_024_ATOMIC_PROMOTION, () => {
    test("a promotion whose bound-id target is occupied leaves the spec tree unchanged", async () => {
      const p = await project();
      const draftPath = await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-001-x.md",
        "Spec SW-TMP-001\n",
      );
      // A promoted spec that references the draft — it must keep the temporary id
      // if the run aborts.
      await writeFile(
        join(p.derivedDir, "SW-009-ref.md"),
        "See SW-TMP-001.\n",
        "utf8",
      );
      // Occupy the bound-id target: the first SW mint binds SW-001, so the
      // pre-flight aborts before anything is staged. The minted id is left as a
      // harmless gap — the guarantee is over the spec tree, not the sequence.
      await writeFile(join(p.derivedDir, "SW-001-x.md"), "occupied\n", "utf8");

      await expect(
        promote({ configFile: p.configFile, stateFile: p.stateFile }),
      ).rejects.toThrow();

      // The spec tree is unchanged: the reference still points at the temporary
      // id, the draft is still a draft, and the occupant is intact.
      expect(await readFile(join(p.derivedDir, "SW-009-ref.md"), "utf8")).toBe(
        "See SW-TMP-001.\n",
      );
      expect(await readFile(draftPath, "utf8")).toBe("Spec SW-TMP-001\n");
      expect(await readFile(join(p.derivedDir, "SW-001-x.md"), "utf8")).toBe(
        "occupied\n",
      );
    });

    test("a successful promotion leaves no staging temporary behind", async () => {
      const p = await project();
      await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-001-x.md",
        "Spec SW-TMP-001\n",
      );
      await writeFile(
        join(p.derivedDir, "SW-009-ref.md"),
        "See SW-TMP-001.\n",
        "utf8",
      );

      await promote({ configFile: p.configFile, stateFile: p.stateFile });

      for (const dir of [p.storiesDir, p.derivedDir, p.draftsDir]) {
        const entries = await readdir(dir, { recursive: true });
        expect(entries.filter((name) => name.endsWith(".tmp"))).toEqual([]);
      }
    });

    test("a leftover staging temporary in the drafts dir is not promoted", async () => {
      const p = await project();
      await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-001-x.md",
        "Spec SW-TMP-001\n",
      );
      // An orphaned staging temp from an interrupted run: its head parses as a
      // temporary id, but the suffix marks it as not a draft.
      const leftover = await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-009-y.md.tmp",
        "leftover\n",
      );

      const result = await promote({
        configFile: p.configFile,
        stateFile: p.stateFile,
      });

      expect(result.promoted.map((entry) => entry.temporaryId)).toEqual([
        "SW-TMP-001",
      ]);
      expect(await readFile(leftover, "utf8")).toBe("leftover\n");
    });
  });
});

describe("rejected drafts", () => {
  verifies(SwTraceables.SW_017_FINALIZE_DRAFTS, () => {
    test("an entity draft fails with E_ENTITY_DRAFT_UNSUPPORTED", async () => {
      const p = await project();
      await writeDraft(
        p.draftsDir,
        "derived-specs",
        "ENT-TMP-3333333333-config.md",
        "x\n",
      );

      await expect(
        promote({ configFile: p.configFile, stateFile: p.stateFile }),
      ).rejects.toMatchObject({ code: ErrorCode.ENTITY_DRAFT_UNSUPPORTED });
    });

    test("a named draft that does not exist fails with E_DRAFT_NOT_FOUND", async () => {
      const p = await project();
      await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-deadbeef01-x.md",
        "x\n",
      );

      await expect(
        promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          drafts: ["SW-TMP-0000000000"],
        }),
      ).rejects.toMatchObject({ code: ErrorCode.DRAFT_NOT_FOUND });
    });
  });
});
