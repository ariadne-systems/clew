import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArchTraceables, ConTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { check } from "../index.js";

type Project = {
  configFile: string;
  storiesDir: string;
  derivedDir: string;
};

// Lays out an empty spec corpus (stories, derived specs) with a config whose
// layout points at those directories, so `check` reads its locations from
// configuration (ENT-002).
async function project(): Promise<Project> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-check-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  const domainModel = join(dir, "docs", "spec", "domain-model.md");
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  await writeFile(
    join(dir, ".ariadnerc.json"),
    JSON.stringify({
      layout: {
        stories: { dir: storiesDir, prefix: "STR" },
        derivedSpecs: { dir: derivedDir },
        entities: { file: domainModel, prefix: "ENT" },
        drafts: { dir: join(dir, "docs", "spec", "drafts") },
      },
    }),
    "utf8",
  );
  return { configFile: join(dir, ".ariadnerc.json"), storiesDir, derivedDir };
}

describe("the check suite", () => {
  verifies(
    [
      ArchTraceables.ARCH_005_CHECKS_ARE_ONE_SUITE,
      ConTraceables.CON_029_RELATION_LINK_RESOLVES,
    ],
    () => {
      test("a clean corpus yields no findings", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [SW-002 — b](SW-002-b.md).\n",
          "utf8",
        );
        await writeFile(join(p.derivedDir, "SW-002-b.md"), "Spec b\n", "utf8");

        const result = await check({ configFile: p.configFile });

        expect(result.findings).toEqual([]);
      });

      test("a link to a non-existent spec is reported by reference-rot", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "Line one.\nSee [SW-099 — gone](SW-099-missing.md).\n",
          "utf8",
        );

        const result = await check({ configFile: p.configFile });

        expect(result.findings).toEqual([
          {
            check: "reference-rot",
            file: join(p.derivedDir, "SW-001-a.md"),
            line: 2,
            message: 'link to "SW-099-missing.md" resolves to nothing',
          },
        ]);
      });

      test("a link from a story across the layout resolves", async () => {
        const p = await project();
        await writeFile(
          join(p.storiesDir, "STR-001-x.md"),
          "Realizes [SW-001 — a](../derived-specs/SW-001-a.md).\n",
          "utf8",
        );
        await writeFile(join(p.derivedDir, "SW-001-a.md"), "Spec a\n", "utf8");

        const result = await check({ configFile: p.configFile });

        expect(result.findings).toEqual([]);
      });

      test("a link to a heading that does not exist is reported", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [the rule](SW-002-b.md#no-such-heading).\n",
          "utf8",
        );
        await writeFile(
          join(p.derivedDir, "SW-002-b.md"),
          "## A Real Heading\n",
          "utf8",
        );

        const result = await check({ configFile: p.configFile });

        expect(result.findings.map((finding) => finding.message)).toEqual([
          'link "SW-002-b.md#no-such-heading" points at a heading that does not exist',
        ]);
      });

      test("an external URL and a bare in-document anchor are not checked", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [home](https://example.com) and [top](#a-heading).\n## A heading\n",
          "utf8",
        );

        const result = await check({ configFile: p.configFile });

        expect(result.findings).toEqual([]);
      });
    },
  );
});

describe("corpus invariant checks", () => {
  verifies(
    [
      ConTraceables.CON_022_VALID_STATUS,
      ConTraceables.CON_025_ONE_FILE_PER_SPEC_ID,
    ],
    () => {
      test("an unrecognized status is reported (invalid-status)", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "**Lens**: SW\n\n**Status**: in-progress\n",
          "utf8",
        );
        await writeFile(
          join(p.derivedDir, "SW-002-b.md"),
          "**Status**: active\n",
          "utf8",
        );

        const result = await check({ configFile: p.configFile });

        expect(
          result.findings.filter((f) => f.check === "invalid-status"),
        ).toEqual([
          {
            check: "invalid-status",
            file: join(p.derivedDir, "SW-001-a.md"),
            line: 3,
            message:
              'unrecognized status "in-progress"; expected one of planned, active, deprecated',
          },
        ]);
      });

      test("two files declaring one id are reported (duplicate-id)", async () => {
        const p = await project();
        await writeFile(join(p.derivedDir, "SW-003-x.md"), "x\n", "utf8");
        await writeFile(join(p.derivedDir, "SW-003-y.md"), "y\n", "utf8");

        const result = await check({ configFile: p.configFile });

        const duplicate = result.findings.filter(
          (f) => f.check === "duplicate-id",
        );
        expect(duplicate).toHaveLength(1);
        expect(duplicate[0]?.message).toContain('spec id "SW-003"');
        expect(duplicate[0]?.message).toContain("SW-003-x.md");
        expect(duplicate[0]?.message).toContain("SW-003-y.md");
      });
    },
  );
});
