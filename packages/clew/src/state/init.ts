import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { readConfiguredPrefixes, readLayout } from "../config/config.js";
import { withState } from "./state.js";

export type InitOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
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
const IGNORED_DIRECTORIES = new Set([".git", ".clew", "node_modules", "dist"]);

/**
 * A bound id at the start of an artifact filename: an uppercase prefix and a
 * number as a whole segment (e.g. `PREFIX-007-...` or `PREFIX-005.md`). The number must
 * close the segment, so a temporary id (`PREFIX-TMP-...`) does not match.
 */
const BOUND_ID_IN_FILENAME = /^([A-Z]+)-(\d+)(?:[-.]|$)/;

/**
 * Initializes the StateStore from existing artifacts: scans the configured
 * layout directories and reconciles the highest number per configured prefix
 * into the state's high-water marks. Only configured prefixes are counted, so
 * non-lens files such as ADRs are ignored.
 */
export async function init(options: InitOptions = {}): Promise<InitResult> {
  const layout = await readLayout(options.configFile);
  const prefixes = await readConfiguredPrefixes(options.configFile);
  const dirs = [layout.stories.dir, layout.specs.dir];
  const discovered = await discoverHighWaterMarks(dirs, prefixes);
  return withState((state) => reconcile(state.sequences, discovered), {
    file: options.stateFile,
  });
}

const reconcile = realizes(
  ConTraceables.CON_009_RECONCILE_NEVER_LOWERS,
  (
    sequences: Record<string, number>,
    discovered: Map<string, number>,
  ): InitResult => {
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
  },
);

/**
 * Walks the given artifact directories and returns the highest number seen per
 * configured prefix. A directory that does not exist is skipped.
 */
const discoverHighWaterMarks = realizes(
  SwTraceables.SW_006_DERIVE_HIGH_WATER_MARKS,
  async (
    dirs: string[],
    prefixes: Set<string>,
  ): Promise<Map<string, number>> => {
    const maxByPrefix = new Map<string, number>();
    for (const dir of dirs) {
      await walkArtifacts(dir, prefixes, maxByPrefix);
    }
    return maxByPrefix;
  },
);

async function walkArtifacts(
  dir: string,
  prefixes: Set<string>,
  maxByPrefix: Map<string, number>,
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
        await walkArtifacts(join(dir, entry.name), prefixes, maxByPrefix);
      }
    } else {
      recordBoundId(entry.name, prefixes, maxByPrefix);
    }
  }
}

function recordBoundId(
  filename: string,
  prefixes: Set<string>,
  maxByPrefix: Map<string, number>,
): void {
  const match = BOUND_ID_IN_FILENAME.exec(filename);
  if (match === null) {
    return;
  }
  const [, prefix, digits] = match;
  if (prefix === undefined || digits === undefined || !prefixes.has(prefix)) {
    return;
  }
  const number = Number(digits);
  if (number > (maxByPrefix.get(prefix) ?? 0)) {
    maxByPrefix.set(prefix, number);
  }
}
