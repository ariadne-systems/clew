import type {
  Realizes,
  StkTraceables,
  SysTraceables,
} from "@ariadne-thread/trace";

export type { CheckOptions, CheckResult, Finding } from "./check/check.js";
export { check, formatCheckReport } from "./check/check.js";
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
  Waiver,
} from "./config/config.js";
export {
  configExists,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_PADDING,
  readConfiguredPrefixes,
  readExclude,
  readGenerators,
  readIdGenerationConfig,
  readIgnore,
  readLayout,
  readLenses,
  readSpecSets,
  readUnexclude,
  readWaivers,
  requireConfig,
  resolveConfiguration,
} from "./config/config.js";
export type { SetupOptions, SetupResult } from "./config/setup.js";
export { setup } from "./config/setup.js";
export type { AriadneState, SequenceMap } from "./entities/ariadne-state.js";
export type { AriadneErrorOptions } from "./errors.js";
export { AriadneError, ErrorCode } from "./errors.js";
export {
  createGeneratorRegistry,
  resolveBuiltinGenerator,
} from "./generators/registry.js";
export type { IdStrategy } from "./mint/id-strategy.js";
export type { MintOptions, MintTemporaryOptions } from "./mint/mint.js";
export { mint, mintTemporary } from "./mint/mint.js";
export type {
  PromotedDraft,
  PromoteOptions,
  PromoteResult,
} from "./promote/promote.js";
export { promote } from "./promote/promote.js";
export type {
  CoverageEntry,
  CoverageResult,
  CoverageStatus,
  ReadUniverseOptions,
  SpecCoverage,
  StaleWaiver,
} from "./spec/coverage.js";
export {
  computeCoverage,
  DEFAULT_COVERAGE_FILE,
  formatCoverageReport,
  readUniverse,
  reconcileWaivers,
  writeCoverageResult,
} from "./spec/coverage.js";
export type {
  AnchorLocation,
  GenerateContext,
  GeneratedFile,
  GeneratedTraceable,
  Generator,
  Relation,
  ScannedSpec,
  SourceFile,
  SpecSet,
} from "./spec/generator.js";
export {
  GENERATED_MARKER,
  generatedHeader,
  parseGeneratedTraceables,
  resolveGeneratorOrThrow,
} from "./spec/generator.js";
export {
  memberIds,
  relationOfVerb,
  setSymbolName,
  toIdentifier,
  toMemberName,
  toPascalCase,
} from "./spec/identifiers.js";
export type { ScanOptions } from "./spec/scan.js";
export { scan } from "./spec/scan.js";
export type { ScanCodeOptions, ScanCodeResult } from "./spec/scan-code.js";
export {
  DEFAULT_LOCATIONS_FILE,
  scanCode,
  writeLocationsIndex,
} from "./spec/scan-code.js";
export type { GeneratorReport, SpecOptions, SpecResult } from "./spec/spec.js";
export { spec } from "./spec/spec.js";
export { groupIntoSpecSets, lensMatchers } from "./spec/spec-set.js";
export type { InitOptions, InitResult, RaisedMark } from "./state/init.js";
export { init } from "./state/init.js";
export type { WithStateOptions } from "./state/state.js";
export { DEFAULT_STATE_FILE, withState } from "./state/state.js";
export type {
  CFamilyDialect,
  ClassifiedSource,
  CommentSpan,
} from "./text/c-family-lexer.js";
export { classifyCFamily, lineOf } from "./text/c-family-lexer.js";

// Module-level anchors — the high-altitude system capabilities this package
// realizes, anchored at module altitude (fine-grained behaviours are anchored at
// their own call sites). A `clew-context` ascent up the file/module tree surfaces
// these for an agent working anywhere in the package.
type _Anchors =
  | Realizes<SysTraceables.SYS_001_COMPILE_CHECKED_ANCHORING, unknown>
  | Realizes<SysTraceables.SYS_002_REVERSE_TRACEABILITY_COVERAGE, unknown>
  | Realizes<SysTraceables.SYS_003_STABLE_SPEC_IDENTITY, unknown>
  | Realizes<SysTraceables.SYS_004_CONFIGURATION_AND_STATE, unknown>
  | Realizes<SysTraceables.SYS_005_SPEC_LIFECYCLE, unknown>
  | Realizes<SysTraceables.SYS_006_DIAGNOSTIC_CLARITY, unknown>
  | Realizes<SysTraceables.SYS_010_CONFIGURABLE_LENSES, unknown>
  | Realizes<SysTraceables.SYS_011_NAMED_ANCHOR_RELATIONS, unknown>
  | Realizes<SysTraceables.SYS_013_SHARED_SCHEMAS, unknown>
  | Realizes<StkTraceables.STK_001_IMPLEMENTATION_ASSURANCE, unknown>
  | Realizes<StkTraceables.STK_002_AUDIT_EVIDENCE, unknown>
  | Realizes<StkTraceables.STK_003_LOW_AUTHORING_FRICTION, unknown>
  | Realizes<StkTraceables.STK_004_TRACEABILITY_WITH_THE_CODE, unknown>
  | Realizes<StkTraceables.STK_006_PROJECT_CONTROLLED_VOCABULARY, unknown>
  | Realizes<StkTraceables.STK_007_SCRIPTABLE_DIAGNOSTICS, unknown>;

const CORE_VERSION = "0.0.0";

// Placeholder export for the scaffold so downstream packages have something to import.
export function coreVersion(): string {
  return CORE_VERSION;
}
