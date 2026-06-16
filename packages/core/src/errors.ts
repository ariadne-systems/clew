/**
 * Stable, mnemonic error codes (ARCH-002).
 * A released code is never reused for a different condition and never renamed
 * (CON-006); new codes are added as real error conditions arise. The full set
 * is documented in `docs/errors.md`.
 */
export const ErrorCode = {
  /** The requested mint count is not a positive whole number. */
  INVALID_COUNT: "E_INVALID_COUNT",
  /** The requested type is not a valid id prefix under the configured pattern. */
  INVALID_TYPE: "E_INVALID_TYPE",
  /** The state file could not be written. */
  STATE_WRITE_FAILED: "E_STATE_WRITE_FAILED",
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * A failure carrying a stable, machine-readable code in addition to its
 * human-readable message (ARCH-002). The code is the failure's identity and is
 * what consumers branch on; the message is for humans and may be reworded.
 */
export class AriadneError extends Error {
  readonly code: ErrorCode;

  constructor(code: ErrorCode, message: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "AriadneError";
  }
}
