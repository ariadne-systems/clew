import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { scan } from "./index.js";

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
        { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
        { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
        { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
      ]);
    });

    test("a non-lens id such as a story is not a traceable", async () => {
      const { configFile } = await fixture(["SW-012-a.md", "STR-011-b.md"]);

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);
    });

    test("a non-markdown file with a lens prefix is not a traceable", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);
      await writeFile(join(derivedDir, "SW-099-notes.txt"), "x", "utf8");

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);
    });

    test("a file whose prefix is not configured contributes no traceable", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);
      await writeFile(join(derivedDir, "ADR-0002-x.md"), "x", "utf8");

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);
    });

    test("a temporary id is not a traceable", async () => {
      const { configFile } = await fixture(["SW-012-a.md", "SW-TMP-abc123.md"]);

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);
    });

    test("removing a spec removes its traceable; adding one adds it", async () => {
      const { derivedDir, configFile } = await fixture(["SW-012-a.md"]);

      const before = await scan({ configFile });
      expect(before).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);

      await writeFile(join(derivedDir, "SW-013-b.md"), "x", "utf8");
      const added = await scan({ configFile });
      expect(added).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
        { id: "SW-013", lens: "SW", filename: "SW-013-b.md" },
      ]);

      await rm(join(derivedDir, "SW-012-a.md"));
      const removed = await scan({ configFile });
      expect(removed).toEqual([
        { id: "SW-013", lens: "SW", filename: "SW-013-b.md" },
      ]);
    });

    test("a missing configured location is skipped, not an error", async () => {
      const { storiesDir, configFile } = await fixture(["SW-012-a.md"]);
      await rm(storiesDir, { recursive: true });

      const traceables = await scan({ configFile });

      expect(traceables).toEqual([
        { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
      ]);
    });
  });
});
