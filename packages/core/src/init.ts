import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { withState } from "./state.js";

export type InitOptions = {
  /**
   * Directory tree scanned for id-bearing artifact files (SW-006).
   * Defaults to the current directory.
   */
  artifactsDir?: string;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
};

/** A high-water mark this run raised, with its previous and new value. */
export type RaisedMark = {
  prefix: string;
  from: number;
  to: number;
};

export type InitResult = {
  /** The high-water mark recorded for each prefix after reconciliation. */
  marks: Record<string, number>;
  /** The marks this run raised; empty when an unchanged project is re-initialized. */
  raised: RaisedMark[];
};

/** Directories never descended into while discovering artifacts. */
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".ariadne",
  "node_modules",
  "dist",
]);

/**
 * A bound id at the start of an artifact filename: an uppercase prefix and a
 * number as a whole segment (e.g. `STR-007-...` or `SW-005.md`). The number must
 * close the segment, so a temporary id (`SW-TMP-...`) does not match — a
 * temporary id is unbound and must never advance a high-water mark (CON-007).
 */
const BOUND_ID_IN_FILENAME = /^([A-Z]+)-(\d+)(?:[-.]|$)/;

/**
 * Initializes the StateStore from existing artifacts (SW-006): discovers the
 * bound ids in the artifact tree, takes the highest number per prefix, and
 * reconciles those into the state's high-water marks. Reconciliation only ever
 * raises a mark, never lowers one (CON-009), so a number already allocated is
 * never handed out again, and re-initializing an unchanged project changes
 * nothing.
 */
export async function init(options: InitOptions = {}): Promise<InitResult> {
  const discovered = await discoverHighWaterMarks(options.artifactsDir ?? ".");
  return withState((state) => reconcile(state.sequences, discovered), {
    file: options.stateFile,
  });
}

/** Raises each prefix's mark to the discovered maximum, never lowering it (CON-009). */
function reconcile(
  sequences: Record<string, number>,
  discovered: Map<string, number>,
): InitResult {
  const raised: RaisedMark[] = [];
  for (const [prefix, discoveredMax] of discovered) {
    const existing = sequences[prefix] ?? 0;
    if (discoveredMax > existing) {
      sequences[prefix] = discoveredMax;
      raised.push({ prefix, from: existing, to: discoveredMax });
    }
  }
  raised.sort((left, right) => left.prefix.localeCompare(right.prefix));
  return { marks: { ...sequences }, raised };
}

/** Walks the artifact tree and returns the highest number seen per prefix (SW-006). */
async function discoverHighWaterMarks(
  artifactsDir: string,
): Promise<Map<string, number>> {
  const maxByPrefix = new Map<string, number>();
  await walkArtifacts(artifactsDir, maxByPrefix);
  return maxByPrefix;
}

async function walkArtifacts(
  dir: string,
  maxByPrefix: Map<string, number>,
): Promise<void> {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!IGNORED_DIRECTORIES.has(entry.name)) {
        await walkArtifacts(join(dir, entry.name), maxByPrefix);
      }
    } else {
      recordBoundId(entry.name, maxByPrefix);
    }
  }
}

function recordBoundId(
  filename: string,
  maxByPrefix: Map<string, number>,
): void {
  const match = BOUND_ID_IN_FILENAME.exec(filename);
  if (match === null) {
    return;
  }
  const [, prefix, digits] = match;
  if (prefix === undefined || digits === undefined) {
    return;
  }
  const number = Number(digits);
  if (number > (maxByPrefix.get(prefix) ?? 0)) {
    maxByPrefix.set(prefix, number);
  }
}
