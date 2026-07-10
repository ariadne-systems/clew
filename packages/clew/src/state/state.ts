import { mkdir, readFile } from "node:fs/promises";
import { dirname } from "node:path";
import { ConTraceables, NfTraceables, realizes } from "@ariadne-thread/trace";
import lockfile from "proper-lockfile";
import type { ClewState, SequenceMap } from "../entities/clew-state.js";
import { ClewError, ErrorCode } from "../errors.js";
import { writeFileAtomic } from "../fs/atomic-write.js";

/** Default location of the committed state file. */
export const DEFAULT_STATE_FILE = ".clew/state.json";

export type WithStateOptions = {
  /** Path to the state file. Defaults to `.clew/state.json`. */
  file?: string;
};

// Wait for a held lock rather than failing immediately, so sessions serialize.
const LOCK_OPTIONS = {
  retries: { retries: 50, factor: 1.2, minTimeout: 5, maxTimeout: 100 },
};

const loadState = realizes(
  ConTraceables.CON_001_STATE_FILE_VERSION_CONTROLLED,
  async (file: string): Promise<ClewState> => {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return { sequences: {} };
      }
      throw error;
    }
    if (raw.trim() === "") {
      return { sequences: {} };
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const sequences =
      typeof parsed.sequences === "object" && parsed.sequences !== null
        ? (parsed.sequences as SequenceMap)
        : {};
    return { ...parsed, sequences };
  },
);

const saveState = realizes(
  NfTraceables.NF_002_ATOMIC_STATE_WRITE,
  async (file: string, state: ClewState): Promise<void> => {
    try {
      await writeFileAtomic(file, `${JSON.stringify(state, null, 2)}\n`);
    } catch (error) {
      throw new ClewError(
        ErrorCode.STATE_WRITE_FAILED,
        `Failed to write the state file ${file}.`,
        { cause: error },
      );
    }
  },
);

/**
 * Opens a locked session on the state file: acquires a cross-process lock,
 * reads the current state (a missing file is empty), runs `run`, saves the
 * result atomically, and releases the lock — even if `run` throws.
 * If `run` throws, the state is not saved. Sections `run` did not touch are preserved.
 */
export const withState: <T>(
  run: (state: ClewState) => T | Promise<T>,
  options?: WithStateOptions,
) => Promise<T> = realizes(
  NfTraceables.NF_001_STATE_ACCESS_MUTUALLY_EXCLUSIVE,
  async <T>(
    run: (state: ClewState) => T | Promise<T>,
    options: WithStateOptions = {},
  ): Promise<T> => {
    const file = options.file ?? DEFAULT_STATE_FILE;
    const dir = dirname(file);
    await mkdir(dir, { recursive: true });
    const release = await lockfile.lock(dir, LOCK_OPTIONS);
    try {
      const state = await loadState(file);
      const result = await run(state);
      await saveState(file, state);
      return result;
    } finally {
      await release();
    }
  },
);
