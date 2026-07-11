import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import {
  readExclude,
  readGenerators,
  readUnexclude,
} from "../config/config.js";
import { writeFileAtomic } from "../fs/atomic-write.js";
import { walkProject } from "../fs/walk-files.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
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
   * Resolves a configured generator name to its implementation. Defaults to the
   * in-tree generator registry.
   */
  resolveGenerator?: (name: string) => Generator | undefined;
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the scan walks. Defaults to the process cwd. */
  projectRoot?: string;
};

export type ScanCodeResult = {
  /** Every anchor found, sorted by file, line, relation, then id. */
  anchors: AnchorLocation[];
};

/**
 * Scans the project's code into the set of anchor locations.
 * It drives each configured generator's discover over the source — the dual of
 * generation — and aggregates the results. The core is language-neutral: it
 * selects the source files (by each generator's extensions) and applies the
 * exclusions — the built-in defaults and the project's configured `exclude` /
 * `unexclude` — and the generators read their own marker grammar back
 * out. The same id may appear at many locations; every one is recorded. The
 * result is sorted.
 */
export const scanCode: (options?: ScanCodeOptions) => Promise<ScanCodeResult> =
  realizes(
    SwTraceables.SW_022_SCAN_CODE_INTO_ANCHOR_LOCATIONS,
    async (options: ScanCodeOptions = {}): Promise<ScanCodeResult> => {
      const projectRoot = options.projectRoot ?? ".";
      const [generatorConfigs, exclude, unexclude] = await Promise.all([
        readGenerators(options.configFile),
        readExclude(options.configFile),
        readUnexclude(options.configFile),
      ]);
      const resolveGenerator =
        options.resolveGenerator ?? resolveBuiltinGenerator;
      const generators = generatorConfigs.map((config) =>
        resolveGeneratorOrThrow(config.type, resolveGenerator),
      );

      const rules = compileExclusionRules({ exclude, unexclude });
      const extensions = new Set(
        generators.flatMap((generator) => generator.sourceExtensions),
      );
      const sources = await collectSources(projectRoot, extensions, rules);

      const anchors: AnchorLocation[] = [];
      for (const generator of generators) {
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
 * scans, applying the exclusions before discovery: an excluded file is
 * not read, and an excluded directory is not descended into — unless an
 * `unexclude` re-includes a path beneath it. A directory that does not exist is
 * skipped. Paths are recorded relative to the project root with forward slashes.
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
    const paths = await walkProject(projectRoot, {
      descend: (dir) => shouldDescend(dir, rules),
      accept: (path) =>
        extensions.has(extname(path)) && !fileExcluded(path, rules),
    });
    return Promise.all(
      paths.map(async (path) => ({
        path,
        contents: await readFile(join(projectRoot, path), "utf8"),
      })),
    );
  },
);

/** Default location of the written locations index. */
export const DEFAULT_LOCATIONS_FILE = ".clew/locations.json";

/**
 * Writes the anchor locations as the locations index, in the shared
 * `locations.json` shape (ADR-0005 D6). The write is atomic — to a temporary file,
 * then renamed into place. A run replaces any existing index wholesale. Returns
 * the path written.
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
