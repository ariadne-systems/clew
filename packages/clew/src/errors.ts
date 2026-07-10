import type { ConTraceables, Realizes } from "@ariadne-thread/trace";
import { ArchTraceables, realizes } from "@ariadne-thread/trace";

// This module owns the released error-code set, realizing the stability constraint.
type _Anchors = Realizes<ConTraceables.CON_006_ERROR_CODE_STABILITY, unknown>;

/**
 * Stable, mnemonic error codes.
 * A released code is never reused for a different condition and never renamed;
 * new codes are added as real error conditions arise. The full set
 * is documented in `docs/errors.md`.
 */
export const ErrorCode = {
  /** The requested mint count is not a positive whole number. */
  INVALID_COUNT: "E_INVALID_COUNT",
  /** The requested type is not a valid id prefix under the configured pattern. */
  INVALID_TYPE: "E_INVALID_TYPE",
  /** The state file could not be written. */
  STATE_WRITE_FAILED: "E_STATE_WRITE_FAILED",
  /** The requested type uses the reserved temporary-id marker `TMP`. */
  RESERVED_TYPE: "E_RESERVED_TYPE",
  /** No project configuration was found; the command directs the user to `setup`. */
  NO_CONFIG: "E_NO_CONFIG",
  /** The configuration names a generator that is not registered. */
  UNKNOWN_GENERATOR: "E_UNKNOWN_GENERATOR",
  /** A traceable matches more than one configured spec set. */
  SPEC_SET_OVERLAP: "E_SPEC_SET_OVERLAP",
  /** A traceable matches no configured spec set and no ignore pattern. */
  SPEC_SET_UNMATCHED: "E_SPEC_SET_UNMATCHED",
  /** A named draft to promote was not found among the pending drafts. */
  DRAFT_NOT_FOUND: "E_DRAFT_NOT_FOUND",
  /** A configured `exclude` or `unexclude` glob could not be compiled. */
  INVALID_EXCLUSION_PATTERN: "E_INVALID_EXCLUSION_PATTERN",
  /** A spec declares a `**Status**` value that is not one of the recognized states. */
  INVALID_SPEC_STATUS: "E_INVALID_SPEC_STATUS",
  /** A draft author postfix (`--as` or `CLEW_DRAFT_AUTHOR`) is not letter-led. */
  INVALID_AUTHOR: "E_INVALID_AUTHOR",
  /** Command options are combined invalidly (e.g. `--as` without `--tmp`). */
  INVALID_OPTIONS: "E_INVALID_OPTIONS",
  /** Two files declare the same bound spec id. */
  DUPLICATE_SPEC_ID: "E_DUPLICATE_SPEC_ID",
  /** A draft in a promotion references a temporary id that is not in the resolved set. */
  UNRESOLVED_REFERENCE: "E_UNRESOLVED_REFERENCE",
  /** A document schema is malformed, or reaches into clew's pinned core (the id form or the status values). */
  INVALID_SCHEMA: "E_INVALID_SCHEMA",
  /** A document violates its schema at `fail` severity (a missing required field or an out-of-enum value). */
  SCHEMA_VIOLATION: "E_SCHEMA_VIOLATION",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * The optional, human-facing context rendered beneath a coded failure, following
 * the compiler-diagnostic convention (rustc/clang): a location pointer, a note on
 * what the condition means, and a help line naming the concrete fix. Any of them
 * may be omitted — a trivial failure carries none, so it renders as a single line.
 */
export interface ClewErrorOptions extends ErrorOptions {
  /** Where the failure was found — a file path, optionally `:line`. Rendered as `--> location`. */
  location?: string;
  /** What the condition means or why it matters. Rendered as `= note: ...`. */
  note?: string;
  /** The concrete action(s) that resolve it. One or more, each rendered as its own `= help: ...` line. */
  help?: string | readonly string[];
}

/**
 * A failure carrying a stable, machine-readable code in addition to its
 * human-readable message. The code is the failure's identity and is
 * what consumers branch on; the message is the one-line summary and may be
 * reworded. The optional `location`/`note`/`help` carry the diagnostic context a
 * user needs to locate and fix the failure, rendered in the compiler convention.
 */
@realizes(ArchTraceables.ARCH_002_STABLE_ERROR_CODES)
export class ClewError extends Error {
  readonly code: ErrorCode;
  readonly location?: string;
  readonly note?: string;
  readonly help?: string | readonly string[];

  constructor(code: ErrorCode, message: string, options?: ClewErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "ClewError";
    this.location = options?.location;
    this.note = options?.note;
    this.help = options?.help;
  }
}
