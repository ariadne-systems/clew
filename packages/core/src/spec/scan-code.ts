import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, extname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { readGenerators } from "../config/config.js";
import { AriadneError, ErrorCode } from "../errors.js";
import type { AnchorLocation, Generator, SourceFile } from "./generator.js";

export type ScanCodeOptions = {
  /**
   * Resolves a configured generator name to its implementation. Injecting the
   * resolution keeps the core free of any dependency on a concrete generator
   * (ADR-0001 D9), exactly as generation does.
   */
  resolveGenerator: (name: string) => Generator | undefined;
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the scan walks. Defaults to the process cwd. */
  projectRoot?: string;
};

export type ScanCodeResult = {
  /** Every anchor found, sorted by file, line, relation, then id. */
  anchors: AnchorLocation[];
};

/**
 * Directory names never descended into: dependency, build, and tool-internal
 * locations that are not the project's own source (CON-016). The configured
 * generators' output directories are excluded in addition (resolved per scan).
 */
const BUILT_IN_EXCLUDED_DIRS = new Set([
  ".git",
  ".ariadne",
  "node_modules",
  "dist",
  "build",
  "coverage",
]);

/**
 * Scans the project's code into the set of anchor locations (SW-022).
 * It drives each configured generator's discover over the source — the dual of
 * generation — and aggregates the results. The core is language-neutral: it
 * selects the source files (by each generator's extensions) and applies the
 * built-in exclusions, and the generators read their own marker grammar back out.
 * The same id may appear at many locations; every one is recorded. The result is
 * sorted so a run is deterministic.
 */
export const scanCode: (options: ScanCodeOptions) => Promise<ScanCodeResult> =
  realizes(
    SwTraceables.SW_022_SCAN_CODE_INTO_ANCHOR_LOCATIONS,
    async (options: ScanCodeOptions): Promise<ScanCodeResult> => {
      const projectRoot = options.projectRoot ?? ".";
      const generatorConfigs = await readGenerators(options.configFile);
      const generators = generatorConfigs.map((config) => {
        const generator = resolveOrThrow(config.type, options.resolveGenerator);
        return {
          generator,
          outputDir: config.outputDir ?? generator.defaultOutputDir,
        };
      });

      const excludedDirs = resolveExcludedOutputDirs(generators);
      const extensions = new Set(
        generators.flatMap(({ generator }) => generator.sourceExtensions),
      );
      const sources = await collectSources(
        projectRoot,
        extensions,
        excludedDirs,
      );

      const anchors: AnchorLocation[] = [];
      for (const { generator } of generators) {
        const matching = sources.filter((source) =>
          generator.sourceExtensions.includes(extname(source.path)),
        );
        anchors.push(...generator.discover(matching));
      }
      sortAnchors(anchors);
      return { anchors };
    },
  );

/**
 * The output directories excluded from the scan: each configured generator's
 * resolved output directory holds the markers' definitions, not their uses, so
 * scanning it would invent anchors no one wrote (CON-016). Resolution needs no
 * lookup there — an id is derived from the member name — so excluding it is safe.
 */
const resolveExcludedOutputDirs = realizes(
  ConTraceables.CON_016_SCAN_BUILTIN_EXCLUSIONS,
  (
    generators: readonly { readonly outputDir: string }[],
  ): ReadonlySet<string> => {
    return new Set(
      generators.map(({ outputDir }) => normalizeRelative(outputDir)),
    );
  },
);

/**
 * Walks the project tree collecting the source files whose extension a generator
 * scans. A built-in excluded directory, or a generator output directory, is not
 * descended into. A directory that does not exist is skipped. Paths are recorded
 * relative to the project root with forward slashes, so they are stable across
 * platforms.
 */
async function collectSources(
  projectRoot: string,
  extensions: ReadonlySet<string>,
  excludedDirs: ReadonlySet<string>,
): Promise<SourceFile[]> {
  const sources: SourceFile[] = [];
  await walk("");
  return sources;

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir =
      relativeDir === "" ? projectRoot : join(projectRoot, relativeDir);
    let entries: Dirent[];
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativeChild =
        relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        const excluded =
          BUILT_IN_EXCLUDED_DIRS.has(entry.name) ||
          excludedDirs.has(relativeChild);
        if (!excluded) {
          await walk(relativeChild);
        }
      } else if (entry.isFile() && extensions.has(extname(entry.name))) {
        const contents = await readFile(
          join(projectRoot, relativeChild),
          "utf8",
        );
        sources.push({ path: relativeChild, contents });
      }
    }
  }
}

/** Default location of the written locations index. */
export const DEFAULT_LOCATIONS_FILE = ".ariadne/locations.json";

/**
 * Writes the anchor locations as the locations index (SW-023), in the shared
 * `locations.json` shape (ADR-0005 D6). The write is atomic — to a temporary file,
 * then renamed into place (NF-002) — so an interrupted scan leaves the previous
 * index intact, never a partial one a later coverage run would trust as complete.
 * A run replaces any existing index wholesale; the scan is full, not incremental.
 * Returns the path written.
 */
export const writeLocationsIndex: (
  result: ScanCodeResult,
  options?: { file?: string; projectRoot?: string },
) => Promise<string> = realizes(
  SwTraceables.SW_023_SCAN_COMMAND,
  async (
    result: ScanCodeResult,
    options: { file?: string; projectRoot?: string } = {},
  ): Promise<string> => {
    const file = join(
      options.projectRoot ?? ".",
      options.file ?? DEFAULT_LOCATIONS_FILE,
    );
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    const body = `${JSON.stringify({ locations: result.anchors }, null, 2)}\n`;
    await writeFile(temporary, body, "utf8");
    await rename(temporary, file);
    return file;
  },
);

/** Normalizes a configured directory to a root-relative, forward-slash path for comparison. */
function normalizeRelative(dir: string): string {
  return dir.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/** Orders anchors deterministically: by file, then line, then relation, then id. */
function sortAnchors(anchors: AnchorLocation[]): void {
  anchors.sort(
    (left, right) =>
      left.file.localeCompare(right.file) ||
      left.line - right.line ||
      left.relation.localeCompare(right.relation) ||
      left.id.localeCompare(right.id),
  );
}

/**
 * Resolves a configured generator name to its implementation, failing fast with a
 * stable code when the configuration names a generator that is not registered.
 */
function resolveOrThrow(
  name: string,
  resolveGenerator: (name: string) => Generator | undefined,
): Generator {
  const generator = resolveGenerator(name);
  if (generator === undefined) {
    throw new AriadneError(
      ErrorCode.UNKNOWN_GENERATOR,
      `Configured generator "${name}" is not registered; remove it from \`generators\` or install a generator that provides it.`,
    );
  }
  return generator;
}
