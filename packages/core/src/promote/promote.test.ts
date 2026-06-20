import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
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
