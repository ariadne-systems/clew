import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ErrorCode, scan } from "../index.js";

type Fixture = {
  storiesDir: string;
  derivedDir: string;
  configFile: string;
};

// Lays out an artifact tree (stories under stories/, other specs under
// derived-specs/) and writes a config whose `layout` points at those
// directories, so `scan` reads the locations from configuration.
async function fixture(idFilenames: string[]): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-scan-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  for (const name of idFilenames) {
    const target = name.startsWith("STR-") ? storiesDir : derivedDir;
    await writeFile(join(target, name), "x", "utf8");
  }
  const configFile = join(dir, ".ariadnerc.json");
  await writeFile(
    configFile,
    JSON.stringify({
      idGeneration: { mode: "sequential", padding: 3 },
      layout: {
        stories: { dir: storiesDir, prefix: "STR" },
        derivedSpecs: { dir: derivedDir },
      },
    }),
    "utf8",
  );
  return { storiesDir, derivedDir, configFile };
}

/** A scanned spec with the default planned status, for assertions. */
function n(id: string, lens: string, filename: string) {
  return { id, lens, filename, status: "planned" };
}

describe("scanning artifacts into traceables", () => {
  verifies(SwTraceables.SW_013_SCAN_TRACEABLES, () => {
    test("yields each lens-bearing id with its lens and filename, sorted by id", async () => {
      const { configFile } = await fixture([
        "SW-013-scan.md",
        "SW-012-command.md",
        "CON-012-owned.md",
        "STR-011-spec.md",
      ]);

      const traceables = await scan({ configFile });

      // The story id is not a lens-bearing spec, so it is not a traceable.
      expect(traceables).toEqual([
        n("CON-012", "CON", "CON-012-owned.md"),
        n("SW-012", "SW", "SW-012-command.md"),
        n("SW-013", "SW", "SW-013-scan.md"),
      ]);
    });

    test("a non-lens id such as a story is not a traceable", async () => {
      const { configFile } = await fixture(["SW-012-a.md", "STR-011-b.md"]);

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([n("SW-012", "SW", "SW-012-a.md")]);
    });

    test("a non-markdown file with a lens prefix is not a traceable", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);
      await writeFile(join(derivedDir, "SW-099-notes.txt"), "x", "utf8");

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([n("SW-012", "SW", "SW-012-a.md")]);
    });

    test("a file whose prefix is not configured contributes no traceable", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);
      await writeFile(join(derivedDir, "ADR-0002-x.md"), "x", "utf8");

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([n("SW-012", "SW", "SW-012-a.md")]);
    });

    test("a temporary id is not a traceable", async () => {
      const { configFile } = await fixture(["SW-012-a.md", "SW-TMP-abc123.md"]);

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([n("SW-012", "SW", "SW-012-a.md")]);
    });

    test("removing a spec removes its traceable; adding one adds it", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);

      const before = await scan({ configFile });
      expect(before).toEqual([n("SW-012", "SW", "SW-012-a.md")]);

      await writeFile(join(derivedDir, "SW-013-b.md"), "x", "utf8");
      const added = await scan({ configFile });
      expect(added).toEqual([
        n("SW-012", "SW", "SW-012-a.md"),
        n("SW-013", "SW", "SW-013-b.md"),
      ]);

      await rm(join(derivedDir, "SW-012-a.md"));
      const removed = await scan({ configFile });
      expect(removed).toEqual([n("SW-013", "SW", "SW-013-b.md")]);
    });

    test("a missing configured location is skipped, not an error", async () => {
      const { storiesDir, configFile } = await fixture(["SW-012-a.md"]);
      await rm(storiesDir, { recursive: true });

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([n("SW-012", "SW", "SW-012-a.md")]);
    });
  });

  verifies(
    [SwTraceables.SW_031_SCAN_SPEC_STATUS, ConTraceables.CON_022_VALID_STATUS],
    () => {
      test("reads each declared status; an absent Status field is planned", async () => {
        const { derivedDir, configFile } = await fixture([]);
        await writeFile(
          join(derivedDir, "SW-001-a.md"),
          "**Status**: active\n",
          "utf8",
        );
        await writeFile(
          join(derivedDir, "SW-002-b.md"),
          "**Status**: deprecated\n",
          "utf8",
        );
        await writeFile(
          join(derivedDir, "SW-003-c.md"),
          "No status field here.\n",
          "utf8",
        );

        const traceables = await scan({ configFile });

        expect(
          traceables.map((traceable) => [traceable.id, traceable.status]),
        ).toEqual([
          ["SW-001", "active"],
          ["SW-002", "deprecated"],
          ["SW-003", "planned"],
        ]);
      });

      test("an unrecognized status value is rejected", async () => {
        const { derivedDir, configFile } = await fixture([]);
        await writeFile(
          join(derivedDir, "SW-001-a.md"),
          "**Status**: in-progress\n",
          "utf8",
        );

        await expect(scan({ configFile })).rejects.toMatchObject({
          code: ErrorCode.INVALID_SPEC_STATUS,
          location: expect.stringContaining("SW-001-a.md"),
        });
      });

      test("a status line with trailing text is rejected, not silently treated as absent", async () => {
        const { derivedDir, configFile } = await fixture([]);
        await writeFile(
          join(derivedDir, "SW-001-a.md"),
          "**Status**: active (was planned)\n",
          "utf8",
        );

        await expect(scan({ configFile })).rejects.toMatchObject({
          code: ErrorCode.INVALID_SPEC_STATUS,
        });
      });
    },
  );
});

describe("duplicate ids", () => {
  verifies(ConTraceables.CON_025_ONE_FILE_PER_SPEC_ID, () => {
    test("two files declaring the same traceable id are rejected, naming both", async () => {
      const { configFile } = await fixture(["SW-013-b.md", "SW-013-a.md"]);

      await expect(scan({ configFile })).rejects.toMatchObject({
        code: ErrorCode.DUPLICATE_SPEC_ID,
        note: expect.stringMatching(/SW-013-a\.md.*SW-013-b\.md/),
      });
    });

    test("distinct ids are accepted", async () => {
      const { configFile } = await fixture(["SW-013-a.md", "SW-014-b.md"]);

      const specs = await scan({ configFile });

      expect(specs.map((spec) => spec.id)).toEqual(["SW-013", "SW-014"]);
    });

    test("a duplicate spanning the two scan roots is named in sorted order, not walk order", async () => {
      const { storiesDir, derivedDir, configFile } = await fixture([]);
      // The same traceable id in both roots. `stories/` is walked first, so its
      // file is seen first; the message must still be sorted, putting the
      // `derived-specs` path (which sorts before `stories`) ahead of it.
      await writeFile(join(storiesDir, "SW-013-z.md"), "x", "utf8");
      await writeFile(join(derivedDir, "SW-013-a.md"), "x", "utf8");

      const error = (await scan({ configFile }).catch(
        (caught) => caught,
      )) as Error & { code?: string; note?: string };

      expect(error.code).toBe(ErrorCode.DUPLICATE_SPEC_ID);
      expect(error.note?.indexOf("SW-013-a.md")).toBeLessThan(
        error.note?.indexOf("SW-013-z.md") ?? -1,
      );
    });

    test("names both files distinctly when they share a basename in different directories", async () => {
      const { derivedDir, configFile } = await fixture([]);
      await mkdir(join(derivedDir, "sub"), { recursive: true });
      await writeFile(join(derivedDir, "SW-013-x.md"), "x", "utf8");
      await writeFile(join(derivedDir, "sub", "SW-013-x.md"), "x", "utf8");

      const error = (await scan({ configFile }).catch(
        (caught) => caught,
      )) as Error & { code?: string; note?: string };

      expect(error.code).toBe(ErrorCode.DUPLICATE_SPEC_ID);
      const named = (error.note ?? "").match(/"([^"]+)" and "([^"]+)"/);
      expect(named?.[1]).toMatch(/SW-013-x\.md$/);
      expect(named?.[2]).toMatch(/SW-013-x\.md$/);
      expect(named?.[1]).not.toBe(named?.[2]);
    });

    test("a file is not a duplicate of itself when the two scan roots overlap", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-scan-"));
      const specDir = join(dir, "docs", "spec");
      await mkdir(specDir, { recursive: true });
      await writeFile(join(specDir, "SW-013-x.md"), "x", "utf8");
      const configFile = join(dir, ".ariadnerc.json");
      await writeFile(
        configFile,
        JSON.stringify({
          idGeneration: { mode: "sequential", padding: 3 },
          layout: {
            stories: { dir: specDir, prefix: "STR" },
            derivedSpecs: { dir: specDir },
          },
        }),
        "utf8",
      );

      const specs = await scan({ configFile });

      expect(specs.map((spec) => spec.id)).toEqual(["SW-013"]);
    });
  });
});

describe("scan-time schema validation", () => {
  verifies(SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD, () => {
    // A project whose `derived-spec` schema requires a `Title` field at the given
    // severity, with one derived spec carrying the supplied body.
    async function schemaProject(
      specBody: string,
      onError = "fail",
    ): Promise<string> {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-scan-"));
      const derivedDir = join(dir, "docs", "spec", "derived-specs");
      await mkdir(derivedDir, { recursive: true });
      await writeFile(
        join(dir, "ds.yml"),
        `onError: ${onError}\nfields:\n  Title:\n    required: true\n`,
        "utf8",
      );
      await writeFile(join(derivedDir, "SW-001-a.md"), specBody, "utf8");
      const configFile = join(dir, ".ariadnerc.json");
      await writeFile(
        configFile,
        JSON.stringify({
          layout: {
            stories: {
              dir: join(dir, "docs", "spec", "stories"),
              prefix: "STR",
            },
            derivedSpecs: { dir: derivedDir },
          },
          schemas: { "derived-spec": "ds.yml" },
        }),
        "utf8",
      );
      return configFile;
    }

    test("a derived spec missing a fail-severity required field rejects the scan", async () => {
      const configFile = await schemaProject("**Lens**: SW\n");

      await expect(scan({ configFile })).rejects.toMatchObject({
        code: ErrorCode.SCHEMA_VIOLATION,
      });
    });

    test("a conformant derived spec scans", async () => {
      const configFile = await schemaProject("**Title**\n\n**Lens**: SW\n");

      const specs = await scan({ configFile });

      expect(specs.map((spec) => spec.id)).toEqual(["SW-001"]);
    });

    test("a warn-severity violation does not stop the scan", async () => {
      const configFile = await schemaProject("**Lens**: SW\n", "warn");

      const specs = await scan({ configFile });

      expect(specs.map((spec) => spec.id)).toEqual(["SW-001"]);
    });

    test("a malformed schema is rejected, naming it", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-scan-"));
      const derivedDir = join(dir, "docs", "spec", "derived-specs");
      await mkdir(derivedDir, { recursive: true });
      await writeFile(join(dir, "ds.yml"), "id:\n  pattern: x\n", "utf8");
      await writeFile(join(derivedDir, "SW-001-a.md"), "**Title**\n", "utf8");
      const configFile = join(dir, ".ariadnerc.json");
      await writeFile(
        configFile,
        JSON.stringify({
          layout: {
            stories: {
              dir: join(dir, "docs", "spec", "stories"),
              prefix: "STR",
            },
            derivedSpecs: { dir: derivedDir },
          },
          schemas: { "derived-spec": "ds.yml" },
        }),
        "utf8",
      );

      await expect(scan({ configFile })).rejects.toMatchObject({
        code: ErrorCode.INVALID_SCHEMA,
      });
    });
  });
});
