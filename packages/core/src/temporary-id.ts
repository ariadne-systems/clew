import { randomBytes } from "node:crypto";

/**
 * The reserved infix that marks a temporary, unbound id (CON-008). It separates
 * the type prefix from the opaque suffix in `<TYPE>-TMP-<opaque>` (SW-005). No
 * configured id token pattern may admit it, so a temporary id is structurally
 * distinct from every bound id and can never be mistaken for one.
 */
export const TEMPORARY_MARKER = "TMP";

/** Number of crypto-random bytes in a temporary id's opaque suffix. */
const OPAQUE_BYTE_LENGTH = 5;

/**
 * Builds a temporary id of the form `<TYPE>-TMP-<opaque>` (SW-005). The opaque
 * suffix is a crypto-random hex token, so temporary ids generated independently
 * do not collide without any central coordination.
 */
export function buildTemporaryId(type: string): string {
  const opaque = randomBytes(OPAQUE_BYTE_LENGTH).toString("hex");
  return `${type}-${TEMPORARY_MARKER}-${opaque}`;
}

/**
 * Whether `type` uses the reserved marker as a hyphen-delimited segment (CON-008).
 * A type with such a segment is forbidden: its bound id would carry `-TMP-` and
 * be misread as temporary, and its temporary id would not parse unambiguously.
 * The check is segment-wise, so `TMPX` is allowed while `TMP` and `MY-TMP` are not.
 */
export function typeUsesReservedMarker(type: string): boolean {
  return type.split("-").includes(TEMPORARY_MARKER);
}
