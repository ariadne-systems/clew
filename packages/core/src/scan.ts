import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { SwTraceables, traces } from "@ariadne-thread/trace";
import { readLayout, readLenses } from "./config.js";
import type { Traceable } from "./generator.js";

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

/**
 * Scans the configured artifact locations into the set of traceables (SW-013).
 * A traceable is a lens-bearing spec id — its prefix is a configured lens
 * (ADR-0003) — tagged with that lens, so the set can be grouped into spec sets
 * for generation. A non-lens id such as a story (`STR`) or entity (`ENT`) is not
 * a traceable and is not scanned. The scan is language-neutral: it reads only the
 * configured layout (ENT-002) and lenses, and knows nothing of any target
 * language. An id added to the specs appears in the set; an id removed disappears
 * from it. The result is sorted by id so generation downstream is deterministic
 * (CON-012).
 */
export async function scan(options: ScanOptions = {}): Promise<Traceable[]> {
  const [layout, lenses] = await Promise.all([
    readLayout(options.configFile),
    readLenses(options.configFile),
  ]);
  const lensIds = new Set(lenses.map((lens) => lens.id));
  const dirs = [layout.stories.dir, layout.derivedSpecs.dir];
  const byId = new Map<string, Traceable>();
  for (const dir of dirs) {
    await collectTraceables(dir, lensIds, byId);
  }
  return [...byId.values()].sort((left, right) =>
    left.id.localeCompare(right.id),
  );
}

/**
 * Walks an artifact directory and records each distinct bound id it finds,
 * keyed by id so a spec is counted once. A directory that does not exist is
 * skipped, so a project missing one of its configured locations still scans.
 */
async function collectTraceables(
  dir: string,
  lensIds: Set<string>,
  byId: Map<string, Traceable>,
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
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        await collectTraceables(join(dir, entry.name), lensIds, byId);
      }
    } else {
      recordTraceable(entry.name, lensIds, byId);
    }
  }
}

/**
 * Records the traceable a filename declares, if any. Only a configured lens
 * prefix counts (ADR-0003), so a non-lens file — a story, an entity, or an ADR —
 * contributes no traceable. The filename is kept on the traceable so spec-set
 * matchers can select on it.
 */
const recordTraceable = traces(
  SwTraceables.SW_013_SCAN_TRACEABLES,
  (
    filename: string,
    lensIds: Set<string>,
    byId: Map<string, Traceable>,
  ): void => {
    const match = SPEC_FILENAME.exec(filename);
    if (match === null) {
      return;
    }
    const [, prefix, digits] = match;
    if (prefix === undefined || digits === undefined || !lensIds.has(prefix)) {
      return;
    }
    const id = `${prefix}-${digits}`;
    byId.set(id, { id, lens: prefix, filename });
  },
);
