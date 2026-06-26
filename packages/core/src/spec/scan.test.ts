import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ErrorCode, scan } from "../index.js";

type Fixture = {
  storiesDir: string;
  derivedDir: string;
  configFile: string;
};

// Lays out an artifact tree (stories under stories/, other specs under
// derived-specs/) and writes a config whose `layout` points at those
// directories, so `scan` reads the locations from configuration (ENT-002).
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

      // STR-011 is a story, not a lens-bearing spec, so it is not a traceable.
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
