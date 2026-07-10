import type { EntTraceables, Realizes } from "@ariadne-thread/trace";

/** Highest number already allocated per id prefix. */
export type SequenceMap = Record<string, number>;

/**
 * The tool's persistent, version-controlled state.
 * A map of sections; `sequences` is the first. Other sections are preserved untouched.
 */
export type ClewState = Realizes<
  EntTraceables.ENT_001_CLEW_STATE,
  {
    sequences: SequenceMap;
  }
>;
