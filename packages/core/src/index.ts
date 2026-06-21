export type {
  GeneratorConfig,
  IdGenerationConfig,
  IdGenerationMode,
  Layout,
  Lens,
  ResolveConfigurationOptions,
  ResolvedConfiguration,
  ResolvedGenerator,
  SpecSetMatcher,
} from "./config/config.js";
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
  resolveConfiguration,
} from "./config/config.js";
export type { SetupOptions, SetupResult } from "./config/setup.js";
export { setup } from "./config/setup.js";
export type { AriadneState, SequenceMap } from "./entities/ariadne-state.js";
export { AriadneError, ErrorCode } from "./errors.js";
export type { IdStrategy } from "./mint/id-strategy.js";
export type { MintOptions } from "./mint/mint.js";
export { mint, mintTemporary } from "./mint/mint.js";
export type {
  PromotedDraft,
  PromoteOptions,
  PromoteResult,
} from "./promote/promote.js";
export { promote } from "./promote/promote.js";
export type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
  Traceable,
} from "./spec/generator.js";
export { GENERATED_MARKER, generatedHeader } from "./spec/generator.js";
export {
  toIdentifier,
  toMemberName,
  toPascalCase,
} from "./spec/identifiers.js";
export type { ScanOptions } from "./spec/scan.js";
export { scan } from "./spec/scan.js";
export type { GeneratorReport, SpecOptions, SpecResult } from "./spec/spec.js";
export { spec } from "./spec/spec.js";
export { groupIntoSpecSets, lensMatchers } from "./spec/spec-set.js";
export type { InitOptions, InitResult, RaisedMark } from "./state/init.js";
export { init } from "./state/init.js";
export type { WithStateOptions } from "./state/state.js";
export { DEFAULT_STATE_FILE, withState } from "./state/state.js";

const CORE_VERSION = "0.0.0";

// Placeholder export for the scaffold so downstream packages have something to import.
export function coreVersion(): string {
  return CORE_VERSION;
}
