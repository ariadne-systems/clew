export type {
  GeneratorConfig,
  IdGenerationConfig,
  IdGenerationMode,
  Layout,
  Lens,
  SpecSetMatcher,
} from "./config.js";
export {
  configExists,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_PADDING,
  readConfiguredPrefixes,
  readGenerators,
  readIdGenerationConfig,
  readIgnore,
  readLayout,
  readLenses,
  readSpecSets,
  requireConfig,
} from "./config.js";
export type { AriadneState, SequenceMap } from "./entities/ariadne-state.js";
export { AriadneError, ErrorCode } from "./errors.js";
export type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
  Traceable,
} from "./generator.js";
export { GENERATED_MARKER, generatedHeader } from "./generator.js";
export type { IdStrategy } from "./id-strategy.js";
export { toIdentifier, toMemberName, toPascalCase } from "./identifiers.js";
export type { InitOptions, InitResult, RaisedMark } from "./init.js";
export { init } from "./init.js";
export type { MintOptions } from "./mint.js";
export { mint, mintTemporary } from "./mint.js";
export type {
  PromotedDraft,
  PromoteOptions,
  PromoteResult,
} from "./promote.js";
export { promote } from "./promote.js";
export type { ScanOptions } from "./scan.js";
export { scan } from "./scan.js";
export type { SetupOptions, SetupResult } from "./setup.js";
export { setup } from "./setup.js";
export type { GeneratorReport, SpecOptions, SpecResult } from "./spec.js";
export { spec } from "./spec.js";
export { groupIntoSpecSets, lensMatchers } from "./spec-set.js";
export type { WithStateOptions } from "./state.js";
export { DEFAULT_STATE_FILE, withState } from "./state.js";

const CORE_VERSION = "0.0.0";

// Placeholder export for the scaffold so downstream packages have something to import.
export function coreVersion(): string {
  return CORE_VERSION;
}
