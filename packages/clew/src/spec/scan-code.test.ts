import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { promisify } from "node:util";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { Generator } from "../index.js";
import {
  scanCode,
  updateLocationsIndex,
  writeLocationsIndex,
} from "../index.js";

const git = promisify(execFile);

/** Initializes a throwaway git repo in the test tree, with signing off so commits never prompt. */
async function gitInit(root: string): Promise<void> {
  await git("git", ["init", "-q"], { cwd: root });
  await git("git", ["config", "user.email", "t@example.com"], { cwd: root });
  await git("git", ["config", "user.name", "Test"], { cwd: root });
  await git("git", ["config", "commit.gpgsign", "false"], { cwd: root });
}

/** Stages and commits everything in the test tree. */
async function gitCommitAll(root: string, message: string): Promise<void> {
  await git("git", ["add", "-A"], { cwd: root });
  await git("git", ["commit", "-q", "-m", message], { cwd: root });
}

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
        { scan: { exclude: ["**/*.fixture.ts"] } },
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
        { scan: { unexclude: ["node_modules/keep/**"] } },
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

describe("incremental scan", () => {
  verifies(ConTraceables.CON_035_INCREMENTAL_SCAN_EQUALS_FULL_SCAN, () => {
    test("rescans only the changed files and matches a full scan of the same state", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        { "src/a.ts": "SW-100", "src/b.ts": "CON-101", "src/c.ts": "NF-102" },
        [{ type: "fake", outputDir: "gen/out" }],
      );
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");

      const first = await updateLocationsIndex(options);
      expect(first.mode).toBe("full");

      await writeFile(join(root, "src/a.ts"), "SW-100-v2", "utf8");
      await rm(join(root, "src/b.ts"));
      await writeFile(join(root, "src/d.ts"), "ARCH-103", "utf8");

      const second = await updateLocationsIndex(options);
      const full = await scanCode(options);

      expect(second.mode).toBe("incremental");
      expect(second.anchors).toEqual(full.anchors);
      expect(second.anchors.map((anchor) => anchor.id)).toEqual([
        "SW-100-v2",
        "NF-102",
        "ARCH-103",
      ]);
    });

    test("a rename is a delete plus an add, and still matches a full scan", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");
      await updateLocationsIndex(options);

      await rm(join(root, "src/a.ts"));
      await writeFile(join(root, "src/renamed.ts"), "SW-100", "utf8");

      const second = await updateLocationsIndex(options);
      const full = await scanCode(options);

      expect(second.anchors).toEqual(full.anchors);
      expect(second.anchors).toEqual([
        { id: "SW-100", relation: "realizes", file: "src/renamed.ts", line: 1 },
      ]);
    });

    test("drops anchors for an untracked file that was scanned then deleted", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");
      await updateLocationsIndex(options);

      // Scan an untracked file into the index, then delete it — git's changed set
      // never mentions a file that was untracked and is now gone.
      await writeFile(join(root, "src/new.ts"), "SW-500", "utf8");
      const withNew = await updateLocationsIndex(options);
      expect(withNew.anchors.map((anchor) => anchor.id).sort()).toEqual([
        "SW-100",
        "SW-500",
      ]);
      await rm(join(root, "src/new.ts"));

      const second = await updateLocationsIndex(options);
      const full = await scanCode(options);
      expect(second.anchors).toEqual(full.anchors);
      expect(second.anchors.map((anchor) => anchor.id)).toEqual(["SW-100"]);
    });

    test("rescans a file that was dirty at the last scan and is then reverted", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");

      // Scan while a.ts is dirty (edited vs the commit).
      await writeFile(join(root, "src/a.ts"), "SW-100-dirty", "utf8");
      const dirty = await updateLocationsIndex(options);
      expect(dirty.anchors.map((anchor) => anchor.id)).toEqual([
        "SW-100-dirty",
      ]);

      // Revert a.ts to its committed content — git no longer reports it changed.
      await writeFile(join(root, "src/a.ts"), "SW-100", "utf8");

      const second = await updateLocationsIndex(options);
      const full = await scanCode(options);
      expect(second.anchors).toEqual(full.anchors);
      expect(second.anchors.map((anchor) => anchor.id)).toEqual(["SW-100"]);
    });
  });

  verifies(SwTraceables.SW_048_SCAN_INCREMENTAL_UPDATE, () => {
    test("falls back to a full scan with no version control, and records no provenance", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };

      const first = await updateLocationsIndex(options);
      const second = await updateLocationsIndex(options);

      expect(first.mode).toBe("full");
      expect(second.mode).toBe("full");
      const index = JSON.parse(
        await readFile(join(root, ".clew/locations.json"), "utf8"),
      );
      expect(index.provenance).toBeUndefined();
    });

    test("falls back to a full scan when the scan configuration changed", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project(
        { "src/a.ts": "SW-100", "src/a.fixture.ts": "SW-999" },
        [{ type: "fake", outputDir: "gen/out" }],
      );
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");
      expect((await updateLocationsIndex(options)).mode).toBe("full");

      // Change the scan config, touching no source file.
      await writeFile(
        configFile,
        JSON.stringify({
          generators: [{ type: "fake", outputDir: "gen/out" }],
          scan: { exclude: ["**/*.fixture.ts"] },
        }),
        "utf8",
      );

      const second = await updateLocationsIndex(options);
      expect(second.mode).toBe("full");
      expect(second.anchors.map((anchor) => anchor.id)).toEqual(["SW-100"]);
    });

    test("--full forces a full scan even when an incremental one is possible", async () => {
      const generator = contentGenerator("gen/out");
      const { root, configFile } = await project({ "src/a.ts": "SW-100" }, [
        { type: "fake", outputDir: "gen/out" },
      ]);
      const options = {
        resolveGenerator: resolveFake(generator),
        configFile,
        projectRoot: root,
      };
      await gitInit(root);
      await gitCommitAll(root, "init");
      await updateLocationsIndex(options);

      await writeFile(join(root, "src/a.ts"), "SW-100-v2", "utf8");
      const forced = await updateLocationsIndex({ ...options, full: true });

      expect(forced.mode).toBe("full");
      expect(forced.anchors.map((anchor) => anchor.id)).toEqual(["SW-100-v2"]);
    });
  });
});
