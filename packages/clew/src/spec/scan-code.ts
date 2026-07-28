import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import {
  readExclude,
  readGenerators,
  readUnexclude,
} from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import { writeFileAtomic } from "../fs/atomic-write.js";
import { pathExists, readFileOrNull } from "../fs/files.js";
import { changedSince, scanState } from "../fs/git.js";
import { walkProject } from "../fs/walk-files.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
import type { ExclusionRules } from "./exclusions.js";
import {
  compileExclusionRules,
  fileExcluded,
  shouldDescend,
} from "./exclusions.js";
import type {
  AnchorLocation,
  Generator,
  Relation,
  SourceFile,
} from "./generator.js";
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

/** The version-control state and scan configuration an index was written at, so the next scan can compute its change set. */
export type Provenance = {
  head: string;
  config: string;
  /** Tracked files dirty against `head` at scan time — rescanned next time so a reverted edit is not missed. */
  dirty: readonly string[];
};

/** The written index: the located anchors, and the provenance a git-backed project records for incremental updates. */
export type LocationsIndex = {
  locations: AnchorLocation[];
  provenance?: Provenance;
};

/** Default location of the written locations index. */
export const DEFAULT_LOCATIONS_FILE = ".clew/locations.json";

/** The scan's resolved inputs, shared by the full and incremental paths. */
type ScanInputs = {
  projectRoot: string;
  generators: Generator[];
  rules: ExclusionRules;
  extensions: Set<string>;
  /** A fingerprint of the file-selection config; a change since the last scan forces a full one. */
  fingerprint: string;
};

async function scanInputs(options: ScanCodeOptions): Promise<ScanInputs> {
  const projectRoot = options.projectRoot ?? ".";
  const [generatorConfigs, exclude, unexclude] = await Promise.all([
    readGenerators(options.configFile),
    readExclude(options.configFile),
    readUnexclude(options.configFile),
  ]);
  const resolveGenerator = options.resolveGenerator ?? resolveBuiltinGenerator;
  const generators = generatorConfigs.map((config) =>
    resolveGeneratorOrThrow(config.type, resolveGenerator),
  );
  const rules = compileExclusionRules({ exclude, unexclude });
  const extensions = new Set(
    generators.flatMap((generator) => generator.sourceExtensions),
  );
  const fingerprint = createHash("sha256")
    .update(
      JSON.stringify({ exclude, unexclude, generators: generatorConfigs }),
    )
    .digest("hex");
  return { projectRoot, generators, rules, extensions, fingerprint };
}

/** Runs each generator's discover over the source files whose extension it scans. */
function discoverAnchors(
  generators: readonly Generator[],
  sources: readonly SourceFile[],
): AnchorLocation[] {
  const anchors: AnchorLocation[] = [];
  for (const generator of generators) {
    const matching = sources.filter((source) =>
      generator.sourceExtensions.includes(extname(source.path)),
    );
    anchors.push(...generator.discover(matching));
  }
  return anchors;
}

/** A full scan of the project: every source discovered and sorted — the result an incremental scan must reproduce. */
async function fullAnchors(inputs: ScanInputs): Promise<AnchorLocation[]> {
  const sources = await collectSources(
    inputs.projectRoot,
    inputs.extensions,
    inputs.rules,
  );
  const anchors = discoverAnchors(inputs.generators, sources);
  sortAnchors(anchors);
  return anchors;
}

/**
 * Scans the project's code into the set of anchor locations by driving each
 * configured generator's discover over the source — the dual of generation. The
 * core is language-neutral: it selects the source files by extension, applies the
 * exclusions, and the generators read their own marker grammar back out. The same
 * id may appear at many locations; every one is recorded, and the result is sorted.
 */
export const scanCode: (options?: ScanCodeOptions) => Promise<ScanCodeResult> =
  realizes(
    SwTraceables.SW_022_SCAN_CODE_INTO_ANCHOR_LOCATIONS,
    async (options: ScanCodeOptions = {}): Promise<ScanCodeResult> => ({
      anchors: await fullAnchors(await scanInputs(options)),
    }),
  );

export type UpdateIndexOptions = ScanCodeOptions & {
  /** The index file, relative to the project root. Defaults to the shared location. */
  file?: string;
  /** Force a full rescan, ignoring any prior index and its provenance. */
  full?: boolean;
};

export type UpdateIndexResult = {
  anchors: AnchorLocation[];
  /** How the index was produced — `incremental` when only version-control's changed set was rescanned. */
  mode: "full" | "incremental";
  /** The path the index was written to. */
  file: string;
};

/**
 * Updates the locations index, rescanning only version-control's changed set when
 * it can safely do so and writing the index with the provenance the next
 * incremental scan needs; it falls back to a full scan whenever the changed set
 * cannot be trusted (see `incrementalAnchors`), or when `full` is set.
 */
export const updateLocationsIndex: (
  options?: UpdateIndexOptions,
) => Promise<UpdateIndexResult> = realizes(
  SwTraceables.SW_048_SCAN_INCREMENTAL_UPDATE,
  async (options: UpdateIndexOptions = {}): Promise<UpdateIndexResult> => {
    const inputs = await scanInputs(options);
    const file = options.file ?? DEFAULT_LOCATIONS_FILE;
    const state = await scanState(inputs.projectRoot);
    const incremental = options.full
      ? null
      : await incrementalAnchors(inputs, file, state !== null);
    const anchors = incremental ?? (await fullAnchors(inputs));
    const provenance =
      state === null
        ? undefined
        : { head: state.head, config: inputs.fingerprint, dirty: state.dirty };
    await writeLocationsIndex(
      { anchors },
      { file, projectRoot: inputs.projectRoot, provenance },
    );
    return {
      anchors,
      mode: incremental === null ? "full" : "incremental",
      file,
    };
  },
);

export type AnchorSite = { relation: Relation; file: string; line: number };

/** How current the index is against version control: whether a source file changed since the scan, which files, and the commit the index reflects. */
export type Freshness = {
  stale: boolean | null;
  changedFiles: string[];
  head: string | null;
};

export type AnchorsReport = {
  /** The requested ids, each mapped to its anchor sites — an empty list when the id has none. */
  anchors: Record<string, AnchorSite[]>;
  freshness: Freshness;
};

export type AnchorsOptions = ScanCodeOptions & {
  /** The ids to resolve; ignored when `all` is set. */
  ids?: readonly string[];
  /** Resolve every id in the index. */
  all?: boolean;
  /** Restrict the sites to one relation. */
  relation?: Relation;
  /** The index file, relative to the project root. */
  file?: string;
};

/**
 * Resolves spec ids to their anchor sites by reading the persisted index once —
 * the read side of the locations index, for a context agent's lateral scan. It
 * writes nothing and does not rescan; freshness is derived from version control
 * against the index's provenance.
 */
export const resolveAnchors: (
  options?: AnchorsOptions,
) => Promise<AnchorsReport> = realizes(
  SwTraceables.SW_047_ANCHORS_COMMAND,
  async (options: AnchorsOptions = {}): Promise<AnchorsReport> => {
    const inputs = await scanInputs(options);
    const file = options.file ?? DEFAULT_LOCATIONS_FILE;
    const index = await readLocationsIndex(inputs.projectRoot, file);
    if (index === null) {
      throw new ClewError(
        ErrorCode.NO_INDEX,
        `No locations index at ${file}.`,
        {
          help: "run `clew scan` to write the index",
        },
      );
    }
    const sitesById = new Map<string, AnchorSite[]>();
    for (const anchor of index.locations) {
      const site: AnchorSite = {
        relation: anchor.relation,
        file: anchor.file,
        line: anchor.line,
      };
      const existing = sitesById.get(anchor.id);
      if (existing === undefined) {
        sitesById.set(anchor.id, [site]);
      } else {
        existing.push(site);
      }
    }
    const ids = options.all
      ? [...sitesById.keys()].sort()
      : (options.ids ?? []);
    const anchors: Record<string, AnchorSite[]> = {};
    for (const id of ids) {
      const sites = sitesById.get(id) ?? [];
      anchors[id] =
        options.relation === undefined
          ? sites
          : sites.filter((site) => site.relation === options.relation);
    }
    return { anchors, freshness: await freshnessOf(inputs, index.provenance) };
  },
);

/** The index's freshness against version control: source files changed since its provenance, or unknown when there is no version control. */
async function freshnessOf(
  inputs: ScanInputs,
  provenance: Provenance | undefined,
): Promise<Freshness> {
  const head = provenance?.head ?? null;
  if (provenance === undefined) {
    return { stale: null, changedFiles: [], head };
  }
  // A changed scan configuration re-selects which files are anchors, so the
  // index is stale wholesale — knowable without version control, and the signal
  // the incremental path gates its full rescan on.
  if (provenance.config !== inputs.fingerprint) {
    return { stale: true, changedFiles: [], head };
  }
  const changed = await changedSince(provenance.head, inputs.projectRoot);
  if (changed === null) {
    return { stale: null, changedFiles: [], head };
  }
  for (const dirty of provenance.dirty ?? []) {
    changed.add(dirty);
  }
  const changedFiles = [...changed]
    .filter(
      (path) =>
        inputs.extensions.has(extname(path)) &&
        !fileExcluded(path, inputs.rules),
    )
    .sort();
  return { stale: changedFiles.length > 0, changedFiles, head };
}

/**
 * The prior index patched for version-control's changed set — a changed file's
 * anchors re-discovered, a deleted file's dropped, unchanged files carried over —
 * or `null` when a full scan is required: no git (or the project root is not the
 * repo root), no trustworthy prior index, or a scan configuration that changed
 * since the last scan.
 */
const incrementalAnchors: (
  inputs: ScanInputs,
  file: string,
  gitReady: boolean,
) => Promise<AnchorLocation[] | null> = realizes(
  ConTraceables.CON_035_INCREMENTAL_SCAN_EQUALS_FULL_SCAN,
  async (
    inputs: ScanInputs,
    file: string,
    gitReady: boolean,
  ): Promise<AnchorLocation[] | null> => {
    if (!gitReady) {
      return null;
    }
    const prior = await readLocationsIndex(inputs.projectRoot, file);
    if (prior?.provenance === undefined) {
      return null;
    }
    if (prior.provenance.config !== inputs.fingerprint) {
      return null;
    }
    const changed = await changedSince(
      prior.provenance.head,
      inputs.projectRoot,
    );
    if (changed === null) {
      return null;
    }
    // A file dirty at the last scan is rescanned even if git no longer reports it
    // changed, so an edit reverted to the committed content is not carried over stale.
    for (const dirty of prior.provenance.dirty ?? []) {
      changed.add(dirty);
    }
    const rescanned = await readSources(
      inputs.projectRoot,
      [...changed],
      inputs.extensions,
      inputs.rules,
    );
    const fresh = discoverAnchors(inputs.generators, rescanned);
    const kept = await existingAnchors(
      inputs.projectRoot,
      prior.locations.filter((anchor) => !changed.has(anchor.file)),
    );
    const anchors = [...kept, ...fresh];
    sortAnchors(anchors);
    return anchors;
  },
);

/**
 * Keeps only the anchors whose file still exists. Version control's changed set
 * misses a file that was **untracked** when scanned and later deleted — never in
 * `git diff`, no longer in `git ls-files --others` — so a carried-over anchor is
 * existence-checked before it survives, or a full scan and an incremental one
 * would diverge on such a file. The check is one stat per distinct file, not a
 * re-read, so the incremental scan stays cheap.
 */
async function existingAnchors(
  projectRoot: string,
  anchors: readonly AnchorLocation[],
): Promise<AnchorLocation[]> {
  const files = [...new Set(anchors.map((anchor) => anchor.file))];
  const present = new Map(
    await Promise.all(
      files.map(
        async (file) =>
          [file, await pathExists(join(projectRoot, file))] as const,
      ),
    ),
  );
  return anchors.filter((anchor) => present.get(anchor.file) === true);
}

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

/** Reads the given project-relative paths as source files, keeping only those a generator scans, not excluded, and still present. */
async function readSources(
  projectRoot: string,
  paths: readonly string[],
  extensions: ReadonlySet<string>,
  rules: ExclusionRules,
): Promise<SourceFile[]> {
  const sources: SourceFile[] = [];
  for (const path of paths) {
    const eligible =
      extensions.has(extname(path)) && !fileExcluded(path, rules);
    const contents = eligible
      ? await readFileOrNull(join(projectRoot, path))
      : null;
    if (contents !== null) {
      sources.push({ path, contents });
    }
  }
  return sources;
}

/** The prior index, or `null` when it is absent or unreadable — a derived cache the incremental path treats as no trustworthy prior, to be rebuilt by a full scan. */
async function readLocationsIndex(
  projectRoot: string,
  file: string,
): Promise<LocationsIndex | null> {
  const raw = await readFileOrNull(join(projectRoot, file));
  if (raw === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LocationsIndex;
    return { locations: parsed.locations ?? [], provenance: parsed.provenance };
  } catch {
    return null;
  }
}

/**
 * Writes the anchor locations as the locations index, in the shared
 * `locations.json` shape (ADR-0005 D6), recording the provenance when one is
 * given. The write is atomic — to a temporary file, then renamed into place — and
 * replaces any existing index wholesale. Returns the path written.
 */
export const writeLocationsIndex: (
  result: ScanCodeResult,
  options?: { file?: string; projectRoot?: string; provenance?: Provenance },
) => Promise<string> = realizes(
  SwTraceables.SW_023_SCAN_COMMAND,
  async (
    result: ScanCodeResult,
    options: {
      file?: string;
      projectRoot?: string;
      provenance?: Provenance;
    } = {},
  ): Promise<string> => {
    const file = join(
      options.projectRoot ?? ".",
      options.file ?? DEFAULT_LOCATIONS_FILE,
    );
    const index: LocationsIndex = {
      locations: result.anchors,
      provenance: options.provenance,
    };
    const body = `${JSON.stringify(index, null, 2)}\n`;
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
