import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import type { IdGenerationConfig } from "../config/config.js";
import {
  readConfiguredPrefixes,
  readIdGenerationConfig,
  readLayout,
} from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import { walkFiles } from "../fs/walk-files.js";
import type { IdStrategy } from "./id-strategy.js";
import { OpaqueIdStrategy } from "./opaque-id-strategy.js";
import { SequentialIdStrategy } from "./sequential-id-strategy.js";
import {
  assertValidAuthor,
  buildTemporaryId,
  TEMPORARY_MARKER,
  temporaryNumberPattern,
  typeUsesReservedMarker,
} from "./temporary-id.js";

export type MintOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
};

export type MintTemporaryOptions = MintOptions & {
  /**
   * The draft author, namespacing the per-author sequence. The caller resolves it
   * (the `--as` option, falling back to `CLEW_DRAFT_AUTHOR`); omitted is the solo
   * default. When given it must be a letter-led, uppercase postfix.
   */
  author?: string;
};

/**
 * Mints `count` ids for `type` in the scheme selected by configuration.
 * The type is rejected — for a reserved marker or an unconfigured prefix —
 * before any allocation.
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
 * Mints `count` temporary, unbound ids for `type` — `<TYPE>-TMP-[<AUTHOR>-]<NNN>`,
 * the optional author namespacing the sequence.
 */
export const mintTemporary: (
  type: string,
  count: number,
  options?: MintTemporaryOptions,
) => Promise<string[]> = realizes(
  [
    SwTraceables.SW_032_TEMPORARY_MINTING_PER_AUTHOR_NUMBERING,
    ConTraceables.CON_007_TEMPORARY_ID_UNBOUND,
  ],
  async (
    type: string,
    count: number,
    options: MintTemporaryOptions = {},
  ): Promise<string[]> => {
    const [prefixes, idConfig, layout] = await Promise.all([
      readConfiguredPrefixes(options.configFile),
      readIdGenerationConfig(options.configFile),
      readLayout(options.configFile),
    ]);
    assertTypeNotReserved(type);
    assertPrefixConfigured(type, prefixes);
    if (!Number.isInteger(count) || count < 1) {
      throw new ClewError(
        ErrorCode.INVALID_COUNT,
        `Mint count must be a positive integer, got ${count}.`,
      );
    }
    const { author } = options;
    if (author !== undefined) {
      assertValidAuthor(author);
    }
    const start = await maxDraftNumber(layout.drafts.dir, type, author);
    return Array.from({ length: count }, (_value, index) =>
      buildTemporaryId(type, author, start + index + 1, idConfig.padding),
    );
  },
);

/**
 * The highest temporary number for `(type, author)` among the draft filenames — 0
 * when none, or when the drafts directory is missing.
 */
const maxDraftNumber = realizes(
  SwTraceables.SW_032_TEMPORARY_MINTING_PER_AUTHOR_NUMBERING,
  async (
    draftsDir: string,
    type: string,
    author: string | undefined,
  ): Promise<number> => {
    const pattern = temporaryNumberPattern(type, author);
    let max = 0;
    for (const file of await walkFiles(draftsDir)) {
      const found = pattern.exec(file.name);
      if (found?.[1] !== undefined) {
        max = Math.max(max, Number(found[1]));
      }
    }
    return max;
  },
);

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
 * story or entity prefix — before any allocation.
 */
const assertPrefixConfigured = realizes(
  ConTraceables.CON_005_ID_PREFIX_MUST_BE_CONFIGURED,
  (type: string, prefixes: Set<string>): void => {
    if (!prefixes.has(type)) {
      throw new ClewError(
        ErrorCode.INVALID_TYPE,
        `Type "${type}" is not a configured prefix; declare it as a lens (or a layout prefix) in .clewrc.json.`,
      );
    }
  },
);

/** Rejects a type that uses the reserved temporary marker as a segment, before any id is produced. */
function assertTypeNotReserved(type: string): void {
  if (typeUsesReservedMarker(type)) {
    throw new ClewError(
      ErrorCode.RESERVED_TYPE,
      `Type "${type}" uses the reserved "${TEMPORARY_MARKER}" marker; choose a type that does not contain "${TEMPORARY_MARKER}" as a "-"-delimited segment.`,
    );
  }
}
