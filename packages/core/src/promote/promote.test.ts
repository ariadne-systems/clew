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
      test("binds an id and moves a named story draft into the stories directory", async () => {
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
          roots: ["STR-TMP-ab12cd34ef"],
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
          roots: ["all"],
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

      test("rewrites a still-unpromoted draft that references a promoted one", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-deadbeef01-scan.md",
          "Spec SW-TMP-deadbeef01\n",
        );
        // A draft not in the promoted set that references the one being promoted.
        const unpromoted = await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-cafe123456-rule.md",
          "Relates to SW-TMP-deadbeef01.\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["SW-TMP-deadbeef01"],
        });

        expect(result.promoted.map((entry) => entry.temporaryId)).toEqual([
          "SW-TMP-deadbeef01",
        ]);
        expect(
          await readFile(join(p.derivedDir, "SW-001-scan.md"), "utf8"),
        ).toBe("Spec SW-001\n");
        // The unpromoted draft now points at the bound id and is still a draft.
        expect(await readFile(unpromoted, "utf8")).toBe("Relates to SW-001.\n");
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
        // A still-unpromoted draft references both; the shorter id's substitution
        // must not rewrite a substring of the longer one.
        const ref = await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-aaaa000099-ref.md",
          "See SW-TMP-10 and SW-TMP-1.\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["SW-TMP-1", "SW-TMP-10"],
        });

        const boundByTemporary = new Map(
          result.promoted.map((draft) => [draft.temporaryId, draft.boundId]),
        );
        const boundShort = boundByTemporary.get("SW-TMP-1");
        const boundLong = boundByTemporary.get("SW-TMP-10");
        expect(await readFile(ref, "utf8")).toBe(
          `See ${boundLong} and ${boundShort}.\n`,
        );
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
          roots: ["SW-TMP-001"],
        });

        expect(result.promoted[0]?.boundId).toBe("SW-001");
        expect(
          await readFile(join(p.derivedDir, "SW-001-note.txt"), "utf8"),
        ).toBe("Spec SW-001\n");
        await expect(readFile(from, "utf8")).rejects.toThrow();
      });

      test("`all` with no pending drafts promotes nothing", async () => {
        const p = await project();

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["all"],
        });

        expect(result.promoted).toEqual([]);
      });
    },
  );
});

describe("resolving the promotion set", () => {
  verifies(
    [
      SwTraceables.SW_035_RESOLVE_SET_AS_REFERENCE_CLOSURE,
      ConTraceables.CON_028_PROMOTION_ROOTED_AT_NAMED_DRAFTS,
    ],
    () => {
      test("promoting a story finalizes the specs it references, which may reference each other", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-aaaa000001-story.md",
          "Realizes SW-TMP-bbbb000002 and CON-TMP-cccc000003.\n",
        );
        // The spec references its sibling — fine, because the story lists both.
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-bbbb000002-behaviour.md",
          "Spec SW-TMP-bbbb000002, held by CON-TMP-cccc000003\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-cccc000003-rule.md",
          "Spec CON-TMP-cccc000003\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["STR-TMP-aaaa000001"],
        });

        expect(result.promoted.map((entry) => entry.boundId).sort()).toEqual([
          "CON-001",
          "STR-001",
          "SW-001",
        ]);
        // The story's references resolve to the bound ids in the moved file.
        expect(
          await readFile(join(p.storiesDir, "STR-001-story.md"), "utf8"),
        ).toBe("Realizes SW-001 and CON-001.\n");
      });

      test("a spec referencing a draft the story did not list is refused, not pulled in", async () => {
        const p = await project();
        // The story lists SW-A only; SW-A references CON-B, which the story omits.
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-aaaa000001-story.md",
          "Realizes SW-TMP-bbbb000002.\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-bbbb000002-a.md",
          "Spec SW-TMP-bbbb000002, held by CON-TMP-cccc000003\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-cccc000003-b.md",
          "Spec CON-TMP-cccc000003\n",
        );

        const promotion = promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["STR-TMP-aaaa000001"],
        });

        await expect(promotion).rejects.toMatchObject({
          code: ErrorCode.UNRESOLVED_REFERENCE,
        });
        // The reference is not followed: nothing is promoted, all three still drafts.
        expect(
          await readFile(join(p.derivedDir, "CON-001-b.md"), "utf8").catch(
            () => "absent",
          ),
        ).toBe("absent");
        expect(
          await readFile(
            join(p.draftsDir, "stories", "STR-TMP-aaaa000001-story.md"),
            "utf8",
          ),
        ).toBe("Realizes SW-TMP-bbbb000002.\n");
      });

      test("naming a spec promotes just that spec", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-aaaa000001-followon.md",
          "A follow-on spec referencing only bound ids: SYS-005.\n",
        );
        // Another unrelated pending draft that must be left alone.
        const other = await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-bbbb000002-other.md",
          "Unrelated story.\n",
        );

        const result = await promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["CON-TMP-aaaa000001"],
        });

        expect(result.promoted.map((entry) => entry.boundId)).toEqual([
          "CON-001",
        ]);
        // The unrelated draft is untouched and still a draft.
        expect(await readFile(other, "utf8")).toBe("Unrelated story.\n");
      });

      test("naming a spec does not follow its references — a referenced draft is refused", async () => {
        const p = await project();
        // A spec named directly that references another, still-unbound draft.
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "SW-TMP-aaaa000001-a.md",
          "Spec SW-TMP-aaaa000001, held by CON-TMP-bbbb000002\n",
        );
        await writeDraft(
          p.draftsDir,
          "derived-specs",
          "CON-TMP-bbbb000002-b.md",
          "Spec CON-TMP-bbbb000002\n",
        );

        const promotion = promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["SW-TMP-aaaa000001"],
        });

        await expect(promotion).rejects.toMatchObject({
          code: ErrorCode.UNRESOLVED_REFERENCE,
        });
        // The spec's reference is not followed: neither draft is promoted.
        expect(
          await readFile(join(p.derivedDir, "SW-001-a.md"), "utf8").catch(
            () => "absent",
          ),
        ).toBe("absent");
        expect(
          await readFile(join(p.derivedDir, "CON-001-b.md"), "utf8").catch(
            () => "absent",
          ),
        ).toBe("absent");
      });

      test("`all` promotes every pending draft", async () => {
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
          roots: ["all"],
        });

        expect(result.promoted.map((entry) => entry.boundId).sort()).toEqual([
          "STR-001",
          "SW-001",
        ]);
      });

      test("an empty roots is rejected with E_INVALID_OPTIONS", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-1111111111-a.md",
          "a\n",
        );

        await expect(
          promote({
            configFile: p.configFile,
            stateFile: p.stateFile,
            roots: [],
          }),
        ).rejects.toMatchObject({ code: ErrorCode.INVALID_OPTIONS });
      });

      test("`all` combined with a named draft is rejected with E_INVALID_OPTIONS", async () => {
        const p = await project();
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-1111111111-a.md",
          "a\n",
        );

        await expect(
          promote({
            configFile: p.configFile,
            stateFile: p.stateFile,
            roots: ["all", "STR-TMP-1111111111"],
          }),
        ).rejects.toMatchObject({ code: ErrorCode.INVALID_OPTIONS });
      });

      test("a named root that does not exist fails with E_DRAFT_NOT_FOUND", async () => {
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
            roots: ["SW-TMP-0000000000"],
          }),
        ).rejects.toMatchObject({ code: ErrorCode.DRAFT_NOT_FOUND });
      });

      test("a reference to a draft outside the set is rejected with E_UNRESOLVED_REFERENCE", async () => {
        const p = await project();
        // The story references a spec that has no pending draft.
        await writeDraft(
          p.draftsDir,
          "stories",
          "STR-TMP-aaaa000001-story.md",
          "Realizes SW-TMP-9999999999.\n",
        );

        const promotion = promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["STR-TMP-aaaa000001"],
        });

        await expect(promotion).rejects.toMatchObject({
          code: ErrorCode.UNRESOLVED_REFERENCE,
        });
        // Nothing was bound or moved: the story is still a draft.
        expect(
          await readFile(
            join(p.draftsDir, "stories", "STR-TMP-aaaa000001-story.md"),
            "utf8",
          ),
        ).toBe("Realizes SW-TMP-9999999999.\n");
      });
    },
  );
});

describe("the promoted tree is never rewritten", () => {
  verifies(ConTraceables.CON_027_NO_TEMPORARY_ID_IN_PROMOTED_CORPUS, () => {
    test("an already-promoted spec that mentions a promoted draft's id is left byte-for-byte unchanged", async () => {
      const p = await project();
      await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-001-scan.md",
        "Spec SW-TMP-001\n",
      );
      // An already-promoted spec that mentions the temporary id as example prose.
      const promotedSpec = join(p.derivedDir, "SW-009-example.md");
      await writeFile(
        promotedSpec,
        "An example temporary id is `SW-TMP-001`.\n",
        "utf8",
      );

      await promote({
        configFile: p.configFile,
        stateFile: p.stateFile,
        roots: ["SW-TMP-001"],
      });

      // The promoted spec is untouched — its example token is not rewritten.
      expect(await readFile(promotedSpec, "utf8")).toBe(
        "An example temporary id is `SW-TMP-001`.\n",
      );
    });
  });
});

describe("atomic finalization", () => {
  verifies(ConTraceables.CON_024_ATOMIC_PROMOTION, () => {
    test("a promotion whose bound-id target is occupied leaves the drafts unchanged", async () => {
      const p = await project();
      const draftPath = await writeDraft(
        p.draftsDir,
        "derived-specs",
        "SW-TMP-001-x.md",
        "Spec SW-TMP-001\n",
      );
      // A still-unpromoted draft that references it — it must keep the temporary id
      // if the run aborts.
      const ref = await writeDraft(
        p.draftsDir,
        "derived-specs",
        "CON-TMP-cafe000099-ref.md",
        "See SW-TMP-001.\n",
      );
      // Occupy the bound-id target: the first SW mint binds SW-001, so the
      // pre-flight aborts before anything is staged. The minted id is left as a
      // harmless gap — the guarantee is over the files, not the sequence.
      await writeFile(join(p.derivedDir, "SW-001-x.md"), "occupied\n", "utf8");

      await expect(
        promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["SW-TMP-001"],
        }),
      ).rejects.toThrow();

      // Nothing changed: the reference still points at the temporary id, the draft
      // is still a draft, and the occupant is intact.
      expect(await readFile(ref, "utf8")).toBe("See SW-TMP-001.\n");
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

      await promote({
        configFile: p.configFile,
        stateFile: p.stateFile,
        roots: ["all"],
      });

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
        roots: ["all"],
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
        promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["ENT-TMP-3333333333"],
        }),
      ).rejects.toMatchObject({ code: ErrorCode.ENTITY_DRAFT_UNSUPPORTED });
    });
  });
});

describe("schema validation on promotion", () => {
  verifies(SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD, () => {
    // A project whose `story` schema requires a `Title` field with `fail` severity.
    async function storySchemaProject(): Promise<Project> {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-promote-"));
      const storiesDir = join(dir, "docs", "spec", "stories");
      const derivedDir = join(dir, "docs", "spec", "derived-specs");
      const draftsDir = join(dir, "docs", "spec", "drafts");
      const domainModel = join(dir, "docs", "spec", "domain-model.md");
      await mkdir(join(draftsDir, "stories"), { recursive: true });
      await mkdir(join(draftsDir, "derived-specs"), { recursive: true });
      await mkdir(storiesDir, { recursive: true });
      await mkdir(derivedDir, { recursive: true });
      await writeFile(
        join(dir, "story.yml"),
        "onError: fail\nfields:\n  Title:\n    required: true\n",
        "utf8",
      );
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
          schemas: { story: "story.yml" },
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

    test("a story missing a fail-severity required field aborts the promotion", async () => {
      const p = await storySchemaProject();
      const from = await writeDraft(
        p.draftsDir,
        "stories",
        "STR-TMP-001-x.md",
        "no title here\n",
      );

      await expect(
        promote({
          configFile: p.configFile,
          stateFile: p.stateFile,
          roots: ["STR-TMP-001"],
        }),
      ).rejects.toMatchObject({ code: ErrorCode.SCHEMA_VIOLATION });

      // The draft is untouched and no id was bound — the abort is before binding.
      expect(await readFile(from, "utf8")).toBe("no title here\n");
      await expect(
        readFile(join(p.storiesDir, "STR-001-x.md"), "utf8"),
      ).rejects.toThrow();
    });

    test("a conformant story promotes", async () => {
      const p = await storySchemaProject();
      await writeDraft(
        p.draftsDir,
        "stories",
        "STR-TMP-001-x.md",
        "**Title**\nA story.\n",
      );

      const result = await promote({
        configFile: p.configFile,
        stateFile: p.stateFile,
        roots: ["STR-TMP-001"],
      });

      expect(result.promoted.map((draft) => draft.boundId)).toEqual([
        "STR-001",
      ]);
    });
  });
});
