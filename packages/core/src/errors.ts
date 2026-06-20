import { ArchTraceables, traces } from "@ariadne-thread/trace";

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
  /** An entity draft cannot be finalized by `promote`; merge it into the domain model by hand. */
  ENTITY_DRAFT_UNSUPPORTED: "E_ENTITY_DRAFT_UNSUPPORTED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * A failure carrying a stable, machine-readable code in addition to its
 * human-readable message. The code is the failure's identity and is
 * what consumers branch on; the message is for humans and may be reworded.
 */
@traces(ArchTraceables.ARCH_002_STABLE_ERROR_CODES)
export class AriadneError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "AriadneError";
  }
}
