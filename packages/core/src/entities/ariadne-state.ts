/** Highest number already allocated per id prefix. */
export type SequenceMap = Record<string, number>;

/**
 * The tool's persistent, version-controlled state (ENT-001 AriadneState).
 * A map of sections; `sequences` is the first. Other sections are preserved untouched.
 */
export type AriadneState = {
  sequences: SequenceMap;
};
