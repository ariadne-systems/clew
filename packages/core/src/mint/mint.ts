import { ArchTraceables, ConTraceables, realizes } from "@ariadne-thread/trace";
import type { IdGenerationConfig } from "../config/config.js";
import {
  readConfiguredPrefixes,
  readIdGenerationConfig,
} from "../config/config.js";
import { AriadneError, ErrorCode } from "../errors.js";
import type { IdStrategy } from "./id-strategy.js";
import { OpaqueIdStrategy } from "./opaque-id-strategy.js";
import { SequentialIdStrategy } from "./sequential-id-strategy.js";
import {
  buildTemporaryId,
  TEMPORARY_MARKER,
  typeUsesReservedMarker,
} from "./temporary-id.js";

export type MintOptions = {
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
};

/**
 * Mints `count` ids for `type`, in the scheme selected by configuration.
 * Before any allocation, the type is rejected if it uses the reserved temporary
 * marker or is not a configured prefix, so a bad prefix fails
 * fast and nothing is allocated. The minting code depends only on the IdStrategy
 * interface; the concrete strategy is chosen by `createIdStrategy`.
 */
export async function mint(
  type: string,
  count: number,
  options: MintOptions = {},
): Promise<string[]> {
  const config = await readIdGenerationConfig(options.configFile);
  const prefixes = await readConfiguredPrefixes(options.configFile);
  assertTypeNotReserved(type);
  assertPrefixConfigured(type, prefixes);
  const strategy = createIdStrategy(config, options.stateFile);
  return strategy.mint(type, count);
}

/**
 * Mints `count` temporary, unbound ids for `type`, each of the form
 * `<TYPE>-TMP-<opaque>`. Temporary minting is stateless: it reads configuration
 * to validate the prefix, but opens no StateStore session, takes no lock, and
 * advances no sequence, so nothing is bound. The prefix is validated by
 * the same rules as the bound path: the reserved-marker rule and the
 * configured-prefix rule, so every temporary id carries exactly one
 * `-TMP-` marker and parses unambiguously.
 */
export async function mintTemporary(
  type: string,
  count: number,
  options: MintOptions = {},
): Promise<string[]> {
  const prefixes = await readConfiguredPrefixes(options.configFile);
  assertTypeNotReserved(type);
  assertPrefixConfigured(type, prefixes);
  if (!Number.isInteger(count) || count < 1) {
    throw new AriadneError(
      ErrorCode.INVALID_COUNT,
      `Mint count must be a positive integer, got ${count}.`,
    );
  }
  return Array.from({ length: count }, () => buildTemporaryId(type));
}

/** Selects the id strategy from configuration. */
const createIdStrategy = realizes(
  ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY,
  (config: IdGenerationConfig, stateFile: string | undefined): IdStrategy => {
    if (config.mode === "opaque") {
      return new OpaqueIdStrategy();
    }
    return new SequentialIdStrategy({ padding: config.padding, stateFile });
  },
);

/**
 * Rejects a type whose prefix is not a configured prefix — a lens id, or the
 * story or entity prefix — before any allocation. The configured
 * prefixes are the single source of truth for id validity (ADR-0003); no id
 * pattern is consulted.
 */
const assertPrefixConfigured = realizes(
  ConTraceables.CON_005_ID_PREFIX_MUST_BE_CONFIGURED,
  (type: string, prefixes: Set<string>): void => {
    if (!prefixes.has(type)) {
      throw new AriadneError(
        ErrorCode.INVALID_TYPE,
        `Type "${type}" is not a configured prefix; declare it as a lens (or a layout prefix) in .ariadnerc.json.`,
      );
    }
  },
);

/**
 * Rejects a type that uses the reserved temporary marker as a segment,
 * before any id is produced. This keeps `-TMP-` out of every bound id and leaves
 * each temporary id with exactly one marker, so the two are never confused and a
 * temporary id parses unambiguously.
 */
function assertTypeNotReserved(type: string): void {
  if (typeUsesReservedMarker(type)) {
    throw new AriadneError(
      ErrorCode.RESERVED_TYPE,
      `Type "${type}" uses the reserved "${TEMPORARY_MARKER}" marker; choose a type that does not contain "${TEMPORARY_MARKER}" as a "-"-delimited segment.`,
    );
  }
}
