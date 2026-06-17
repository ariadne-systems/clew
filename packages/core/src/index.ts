export type {
  IdGenerationConfig,
  IdGenerationMode,
  Layout,
  Lens,
} from "./config.js";
export {
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_PADDING,
  readConfiguredPrefixes,
  readIdGenerationConfig,
  readLayout,
  readLenses,
} from "./config.js";
export type { AriadneState, SequenceMap } from "./entities/ariadne-state.js";
export { AriadneError, ErrorCode } from "./errors.js";
export type { IdStrategy } from "./id-strategy.js";
export type { InitOptions, InitResult, RaisedMark } from "./init.js";
export { init } from "./init.js";
export type { MintOptions } from "./mint.js";
export { mint, mintTemporary } from "./mint.js";
export type { WithStateOptions } from "./state.js";
export { DEFAULT_STATE_FILE, withState } from "./state.js";

const CORE_VERSION = "0.0.0";

// Placeholder export for the scaffold so downstream packages have something to import.
export function coreVersion(): string {
  return CORE_VERSION;
}
