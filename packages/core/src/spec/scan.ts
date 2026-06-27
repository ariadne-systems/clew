import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { readLayout, readLenses } from "../config/config.js";
import { AriadneError, ErrorCode } from "../errors.js";
import type { ScannedSpec, SpecStatus } from "./generator.js";
import { SPEC_STATUSES } from "./generator.js";

export type ScanOptions = {
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
};

/** Directories never descended into while scanning artifacts. */
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".ariadne",
  "node_modules",
  "dist",
]);

/**
 * A markdown spec filename: a bound id at the start — an uppercase prefix and a
 * number as a whole segment (e.g. `SW-013-scan.md` or `SW-013.md`) — and the
 * `.md` extension at the end. The number must close the id segment, so a
 * temporary id (`SW-TMP-...`) does not match; the `.md` anchor keeps a non-spec
 * file out and keeps the scan coherent with the `.md`-anchored default lens
 * matchers, so every scanned traceable groups (no silent drop).
 */
const SPEC_FILENAME = /^([A-Z]+)-(\d+)(?:-.*)?\.md$/;

/** A scanned traceable and the path it was found at, for duplicate detection. */
type SeenSpec = { path: string; spec: ScannedSpec };

/**
 * Scans the configured artifact locations into the set of traceables.
 * A traceable is a lens-bearing spec id — its prefix is a configured lens
 * (ADR-0003) — tagged with that lens, so the set can be grouped into spec sets
 * for generation. A non-lens id such as a story (`STR`) or entity (`ENT`) is not
 * a traceable and is not scanned. A traceable id that two files declare is rejected,
 * so a duplicate never collapses silently. The scan is language-neutral: it reads
 * only the configured layout (ENT-002) and lenses, and knows nothing of any target
 * language. An id added to the specs appears in the set; an id removed disappears
 * from it. The result is sorted by id so generation downstream is deterministic.
 */
export async function scan(options: ScanOptions = {}): Promise<ScannedSpec[]> {
  const [layout, lenses] = await Promise.all([
    readLayout(options.configFile),
    readLenses(options.configFile),
  ]);
  const lensIds = new Set(lenses.map((lens) => lens.id));
  const dirs = [layout.stories.dir, layout.derivedSpecs.dir];
  // Each traceable id mapped to where it was found, so a second file declaring it
  // is rejected — and the same file reached twice (overlapping roots) is not.
  const seen = new Map<string, SeenSpec>();
  for (const dir of dirs) {
    await collectTraceables(dir, lensIds, seen);
  }
  return [...seen.values()]
    .map((entry) => entry.spec)
    .sort((left, right) => left.id.localeCompare(right.id));
}

/**
 * Walks an artifact directory and records each distinct bound id it finds,
 * keyed by id so a spec is counted once. A directory that does not exist is
 * skipped, so a project missing one of its configured locations still scans.
 */
async function collectTraceables(
  dir: string,
  lensIds: Set<string>,
  seen: Map<string, SeenSpec>,
): Promise<void> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return;
    }
    throw error;
  }
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        await collectTraceables(path, lensIds, seen);
      }
    } else {
      await recordTraceable(path, entry.name, lensIds, seen);
    }
  }
}

/**
 * A spec's `**Status**` field. The value is the rest of the line, trimmed — so a
 * line with trailing text (e.g. `**Status**: active (was planned)`) captures the
 * whole thing and is rejected as unrecognized (CON-022), rather than failing to
 * match and silently falling through to `planned`.
 */
const STATUS_FIELD = /^\*\*Status\*\*:[ \t]*(.+?)[ \t]*$/m;

/**
 * Reads a spec's implementation state from its `**Status**` field (SW-031): the
 * declared value, or `planned` when the field is absent. An unrecognized
 * value is rejected rather than silently dropping the spec out of enforcement
 * (CON-022).
 */
const readSpecStatus: (content: string) => SpecStatus = realizes(
  [SwTraceables.SW_031_SCAN_SPEC_STATUS, ConTraceables.CON_022_VALID_STATUS],
  (content: string): SpecStatus => {
    const value = STATUS_FIELD.exec(content)?.[1];
    if (value === undefined) {
      return "planned";
    }
    if (!(SPEC_STATUSES as readonly string[]).includes(value)) {
      throw new AriadneError(
        ErrorCode.INVALID_SPEC_STATUS,
        `Unrecognized spec status "${value}"; expected one of ${SPEC_STATUSES.join(", ")}.`,
      );
    }
    return value as SpecStatus;
  },
);

/**
 * Records the traceable a filename declares, and rejects a duplicate. Only a
 * configured lens prefix counts, so a story, entity, or ADR contributes nothing. A
 * second file declaring an already-seen traceable id is rejected rather than
 * overwriting the first, so a duplicate never collapses silently. The filename is
 * kept on the traceable so spec-set matchers can select on it, and the spec's
 * `**Status**` is read onto it.
 */
const recordTraceable: (
  filePath: string,
  filename: string,
  lensIds: Set<string>,
  seen: Map<string, SeenSpec>,
) => Promise<void> = realizes(
  [
    SwTraceables.SW_013_SCAN_TRACEABLES,
    ConTraceables.CON_025_ONE_FILE_PER_SPEC_ID,
  ],
  async (
    filePath: string,
    filename: string,
    lensIds: Set<string>,
    seen: Map<string, SeenSpec>,
  ): Promise<void> => {
    const match = SPEC_FILENAME.exec(filename);
    if (match === null) {
      return;
    }
    const [, prefix, digits] = match;
    if (prefix === undefined || digits === undefined || !lensIds.has(prefix)) {
      return;
    }
    const id = `${prefix}-${digits}`;
    const existing = seen.get(id);
    if (existing !== undefined) {
      // The same file reached twice (overlapping scan roots) is not a duplicate;
      // only a different file declaring the id is. Sort the two paths so the
      // rejection reads the same whatever order the walk reached them.
      if (existing.path === filePath) {
        return;
      }
      const [first, second] = [existing.path, filePath].sort();
      throw new AriadneError(
        ErrorCode.DUPLICATE_SPEC_ID,
        `Spec id "${id}" is declared by more than one file: "${first}" and "${second}". Each bound id must be declared by exactly one file.`,
      );
    }
    const status = readSpecStatus(await readFile(filePath, "utf8"));
    seen.set(id, {
      path: filePath,
      spec: { id, lens: prefix, filename, status },
    });
  },
);
