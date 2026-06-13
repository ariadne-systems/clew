export type { AriadneState, SequenceMap } from "./entities/ariadne-state.js";
export type { WithStateOptions } from "./state.js";
export { DEFAULT_STATE_FILE, withState } from "./state.js";

const CORE_VERSION = "0.0.0";

// Placeholder export for the scaffold so downstream packages have something to import.
export function coreVersion(): string {
  return CORE_VERSION;
}
