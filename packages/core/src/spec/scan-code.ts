import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import {
  readExclude,
  readGenerators,
  readUnexclude,
} from "../config/config.js";
import { writeFileAtomic } from "../fs/atomic-write.js";
import type { ExclusionRules } from "./exclusions.js";
import {
  compileExclusionRules,
  fileExcluded,
  shouldDescend,
} from "./exclusions.js";
import type { AnchorLocation, Generator, SourceFile } from "./generator.js";
import { resolveGeneratorOrThrow } from "./generator.js";

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
 * Scans the project's code into the set of anchor locations (SW-022).
 * It drives each configured generator's discover over the source — the dual of
 * generation — and aggregates the results. The core is language-neutral: it
 * selects the source files (by each generator's extensions) and applies the
 * exclusions — the built-in defaults and the project's configured `exclude` /
 * `unexclude` (STR-017) — and the generators read their own marker grammar back
 * out. The same id may appear at many locations; every one is recorded. The
 * result is sorted so a run is deterministic.
 */
export const scanCode: (options: ScanCodeOptions) => Promise<ScanCodeResult> =
  realizes(
    SwTraceables.SW_022_SCAN_CODE_INTO_ANCHOR_LOCATIONS,
    async (options: ScanCodeOptions): Promise<ScanCodeResult> => {
      const projectRoot = options.projectRoot ?? ".";
      // These reads are independent; run them concurrently rather than serially.
      const [generatorConfigs, exclude, unexclude] = await Promise.all([
        readGenerators(options.configFile),
        readExclude(options.configFile),
        readUnexclude(options.configFile),
      ]);
      const generators = generatorConfigs.map((config) => {
        const generator = resolveGeneratorOrThrow(
          config.type,
          options.resolveGenerator,
        );
        return {
          generator,
          outputDir: config.outputDir ?? generator.defaultOutputDir,
        };
      });

      const rules = compileExclusionRules({
        exclude,
        unexclude,
        outputDirs: generators.map(({ outputDir }) => outputDir),
      });
      const extensions = new Set(
        generators.flatMap(({ generator }) => generator.sourceExtensions),
      );
      const sources = await collectSources(projectRoot, extensions, rules);

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
 * Walks the project tree collecting the source files whose extension a generator
 * scans, applying the exclusions before discovery (SW-024): an excluded file is
 * not read, and an excluded directory is not descended into — unless an
 * `unexclude` re-includes a path beneath it. A directory that does not exist is
 * skipped. Paths are recorded relative to the project root with forward slashes,
 * so they are stable across platforms.
 */
const collectSources: (
  projectRoot: string,
  extensions: ReadonlySet<string>,
  rules: ExclusionRules,
) => Promise<SourceFile[]> = realizes(
  SwTraceables.SW_024_EXCLUDE_MATCHING_PATHS,
  async (
    projectRoot: string,
    extensions: ReadonlySet<string>,
    rules: ExclusionRules,
  ): Promise<SourceFile[]> => {
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
          if (shouldDescend(relativeChild, rules)) {
            await walk(relativeChild);
          }
        } else if (
          entry.isFile() &&
          extensions.has(extname(entry.name)) &&
          !fileExcluded(relativeChild, rules)
        ) {
          const contents = await readFile(
            join(projectRoot, relativeChild),
            "utf8",
          );
          sources.push({ path: relativeChild, contents });
        }
      }
    }
  },
);

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
    const body = `${JSON.stringify({ locations: result.anchors }, null, 2)}\n`;
    await writeFileAtomic(file, body);
    return file;
  },
);

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
