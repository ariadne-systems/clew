import type { IdGenerationConfig } from "./config.js";
import { readIdGenerationConfig, readIdTokenPattern } from "./config.js";
import { AriadneError, ErrorCode } from "./errors.js";
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
 * Mints `count` ids for `type`, in the scheme selected by configuration (ARCH-001).
 * Before any allocation, the type is validated against the configured id token
 * pattern, so a malformed prefix fails fast and nothing is allocated (CON-005),
 * and rejected if it uses the reserved temporary marker (CON-008).
 * The minting code depends only on the IdStrategy interface; the concrete
 * strategy is chosen by `createIdStrategy`.
 */
export async function mint(
  type: string,
  count: number,
  options: MintOptions = {},
): Promise<string[]> {
  const config = await readIdGenerationConfig(options.configFile);
  const tokenPattern = await readIdTokenPattern(options.configFile);
  assertTypeMatchesPattern(type, tokenPattern, config.padding);
  assertTypeNotReserved(type);
  const strategy = createIdStrategy(config, options.stateFile);
  return strategy.mint(type, count);
}

/**
 * Mints `count` temporary, unbound ids for `type` (SW-005), each of the form
 * `<TYPE>-TMP-<opaque>`. Temporary minting is stateless: it reads configuration
 * to validate the prefix, but opens no StateStore session, takes no lock, and
 * advances no sequence, so nothing is bound (CON-007). The prefix is validated
 * by the same rules as the bound path: the configured id token pattern (CON-005)
 * and the reserved-marker rule (CON-008), so every temporary id carries exactly
 * one `-TMP-` marker and parses unambiguously.
 */
export async function mintTemporary(
  type: string,
  count: number,
  options: MintOptions = {},
): Promise<string[]> {
  const config = await readIdGenerationConfig(options.configFile);
  const tokenPattern = await readIdTokenPattern(options.configFile);
  assertTypeMatchesPattern(type, tokenPattern, config.padding);
  assertTypeNotReserved(type);
  if (!Number.isInteger(count) || count < 1) {
    throw new AriadneError(
      ErrorCode.INVALID_COUNT,
      `Mint count must be a positive integer, got ${count}.`,
    );
  }
  return Array.from({ length: count }, () => buildTemporaryId(type));
}

/** Selects the id strategy from configuration (ARCH-001). */
function createIdStrategy(
  config: IdGenerationConfig,
  stateFile: string | undefined,
): IdStrategy {
  if (config.mode === "opaque") {
    return new OpaqueIdStrategy();
  }
  return new SequentialIdStrategy({ padding: config.padding, stateFile });
}

/**
 * Rejects a type whose minted id would not match the configured id token
 * pattern, before any allocation (CON-005). A candidate id is rendered from the
 * type and the configured padding and tested against the pattern, so a
 * malformed prefix is caught regardless of the number. The configured padding
 * is expected to agree with the pattern's number width. When no pattern is
 * configured there is nothing to enforce.
 */
function assertTypeMatchesPattern(
  type: string,
  tokenPattern: string | undefined,
  padding: number,
): void {
  if (tokenPattern === undefined) {
    return;
  }
  const candidate = `${type}-${String(1).padStart(padding, "0")}`;
  const matcher = new RegExp(`^(?:${tokenPattern})$`);
  if (!matcher.test(candidate)) {
    throw new AriadneError(
      ErrorCode.INVALID_TYPE,
      `Type "${type}" is not a valid id prefix under the configured pattern ${tokenPattern}.`,
    );
  }
}

/**
 * Rejects a type that uses the reserved temporary marker as a segment (CON-008),
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
