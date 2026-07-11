import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { Generator } from "../index.js";
import { scanCode, writeLocationsIndex } from "../index.js";

/**
 * A generator whose discover treats each source file's trimmed content as a
 * single realizes anchor, so the core's walking, exclusion, and aggregation can
 * be asserted without depending on a real language scan.
 */
function contentGenerator(outputDir: string): Generator {
  return {
    name: "fake",
    defaultOutputDir: outputDir,
    sourceExtensions: [".ts"],
    findComments: () => [],
    readTraceables: () => [],
    generate: async () => [],
    discover: (sources) =>
      sources.map((source) => ({
        id: source.contents.trim(),
        relation: "realizes" as const,
        file: source.path,
        line: 1,
      })),
  };
}

/** Writes a temporary project tree with the given files and a generators config. */
async function project(
  files: Record<string, string>,
  generators: unknown,
  extra: Record<string, unknown> = {},
): Promise<{ root: string; configFile: string }> {
  const root = await mkdtemp(join(tmpdir(), "clew-scan-"));
  const configFile = join(root, ".clewrc.json");
  await writeFile(configFile, JSON.stringify({ generators, ...extra }), "utf8");
  for (const [relative, contents] of Object.entries(files)) {
    const absolute = join(root, relative);
    await mkdir(dirname(absolute), { recursive: true });
    await writeFile(absolute, contents, "utf8");
  }
  return { root, configFile };
}

const resolveFake = (generator: Generator) => (name: string) =>
  name === "fake" ? generator : undefined;

describe("code scan", () => {
  verifies(SwTraceables.SW_022_SCAN_CODE_INTO_ANCHOR_LOCATIONS, () => {
    test("drives the generator's discover through the interface and aggregates anchors, sorted", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        {
          "src/a.ts": "SW-100",
          "src/nested/f.ts": "CON-101",
        },
        [{ type: "fake", outputDir: "gen/out" }],
      );

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect(result.anchors).toEqual([
        { id: "SW-100", relation: "realizes", file: "src/a.ts", line: 1 },
        {
          id: "CON-101",
          relation: "realizes",
          file: "src/nested/f.ts",
          line: 1,
        },
      ]);
    });

    test("reads only files matching a generator's extensions", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        { "src/a.ts": "SW-100", "src/notes.txt": "SW-999" },
        [{ type: "fake", outputDir: "gen/out" }],
      );

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect(result.anchors.map((anchor) => anchor.id)).toEqual(["SW-100"]);
    });
  });

  verifies(ConTraceables.CON_016_SCAN_BUILTIN_EXCLUSIONS, () => {
    test("excludes dependency and build locations, but not the generator output", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        {
          "src/a.ts": "SW-100",
          "node_modules/pkg/b.ts": "SW-200",
          "dist/c.ts": "SW-300",
          "gen/out/d.ts": "SW-400",
        },
        [{ type: "fake", outputDir: "gen/out" }],
      );

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect([...result.anchors.map((anchor) => anchor.id)].sort()).toEqual([
        "SW-100",
        "SW-400",
      ]);
    });
  });

  verifies(SwTraceables.SW_024_EXCLUDE_MATCHING_PATHS, () => {
    test("a configured exclude removes a matching file from the scan", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        { "src/a.ts": "SW-100", "src/a.fixture.ts": "SW-200" },
        [{ type: "fake", outputDir: "gen/out" }],
        { exclude: ["**/*.fixture.ts"] },
      );

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect(result.anchors.map((anchor) => anchor.id)).toEqual(["SW-100"]);
    });

    test("unexclude re-includes a file under a built-in-excluded directory", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        { "src/a.ts": "SW-100", "node_modules/keep/b.ts": "SW-300" },
        [{ type: "fake", outputDir: "gen/out" }],
        { unexclude: ["node_modules/keep/**"] },
      );

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect([...result.anchors.map((anchor) => anchor.id)].sort()).toEqual([
        "SW-100",
        "SW-300",
      ]);
    });
  });

  verifies(SwTraceables.SW_023_SCAN_COMMAND, () => {
    test("writes the locations index in the shared shape and replaces it wholesale", async () => {
      const { root } = await project({}, []);

      await writeLocationsIndex(
        {
          anchors: [
            { id: "SW-100", relation: "realizes", file: "src/a.ts", line: 3 },
            { id: "ARCH-001", relation: "concerns", file: "src/b.ts", line: 9 },
          ],
        },
        { projectRoot: root },
      );
      const first = JSON.parse(
        await readFile(join(root, ".clew/locations.json"), "utf8"),
      );
      expect(first).toEqual({
        locations: [
          { id: "SW-100", relation: "realizes", file: "src/a.ts", line: 3 },
          { id: "ARCH-001", relation: "concerns", file: "src/b.ts", line: 9 },
        ],
      });

      await writeLocationsIndex(
        {
          anchors: [
            { id: "NF-001", relation: "verifies", file: "t.ts", line: 1 },
          ],
        },
        { projectRoot: root },
      );
      const second = JSON.parse(
        await readFile(join(root, ".clew/locations.json"), "utf8"),
      );
      expect(second).toEqual({
        locations: [
          { id: "NF-001", relation: "verifies", file: "t.ts", line: 1 },
        ],
      });
    });
  });

  verifies(ArchTraceables.ARCH_004_GENERATOR_DISCOVERS_MARKERS, () => {
    test("the core reaches discovery only through the generator interface", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);

      const result = await scanCode({
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      });

      expect(result.anchors).toEqual([
        { id: "SW-100", relation: "realizes", file: "src/a.ts", line: 1 },
      ]);
    });
  });
});
