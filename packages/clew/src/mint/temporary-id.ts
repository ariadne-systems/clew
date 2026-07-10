import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { ClewError, ErrorCode } from "../errors.js";
import { escapeRegExp } from "../text/escape-regexp.js";

/** The reserved infix marking a temporary, unbound id: the `TMP` in `<TYPE>-TMP-[<AUTHOR>-]<NNN>`. */
export const TEMPORARY_MARKER = "TMP";

/** The author postfix grammar: letter-led and uppercase. */
const AUTHOR_SEGMENT = "[A-Z][A-Z0-9]*";
const AUTHOR_PATTERN = new RegExp(`^${AUTHOR_SEGMENT}$`);

/** Rejects an author that does not match the postfix grammar, or is the reserved marker. */
export const assertValidAuthor: (author: string) => void = realizes(
  ConTraceables.CON_023_TEMPORARY_AUTHOR_LETTER_LED,
  (author: string): void => {
    if (!AUTHOR_PATTERN.test(author)) {
      throw new ClewError(
        ErrorCode.INVALID_AUTHOR,
        `Author "${author}" must be letter-led and uppercase (${AUTHOR_SEGMENT}); a bare number or lower-case author is rejected.`,
      );
    }
    if (author === TEMPORARY_MARKER) {
      throw new ClewError(
        ErrorCode.INVALID_AUTHOR,
        `Author "${author}" must not be the reserved "${TEMPORARY_MARKER}" marker.`,
      );
    }
  },
);

/** Builds a temporary id `<TYPE>-TMP-[<AUTHOR>-]<NNN>` with the zero-padded sequence number. */
export const buildTemporaryId: (
  type: string,
  author: string | undefined,
  sequence: number,
  padding: number,
) => string = realizes(
  SwTraceables.SW_032_TEMPORARY_MINTING_PER_AUTHOR_NUMBERING,
  (
    type: string,
    author: string | undefined,
    sequence: number,
    padding: number,
  ): string => {
    const postfix = author === undefined ? "" : `${author}-`;
    const number = String(sequence).padStart(padding, "0");
    return `${type}-${TEMPORARY_MARKER}-${postfix}${number}`;
  },
);

/**
 * A regex over a draft filename capturing the temporary number for `(type, author)`
 * in group 1. The digits must end at a `-`, `.`, or end of name, so the leading
 * digits of a legacy opaque hex suffix are not read as a number.
 */
export function temporaryNumberPattern(
  type: string,
  author: string | undefined,
): RegExp {
  const postfix = author === undefined ? "" : `${escapeRegExp(author)}-`;
  return new RegExp(
    `^${escapeRegExp(type)}-${TEMPORARY_MARKER}-${postfix}(\\d+)(?=-|\\.|$)`,
  );
}

/**
 * Matches a temporary id at the head of a draft filename: group 1 is the prefix,
 * `match[0]` the full id. The trailing run admits hex, so a legacy opaque
 * `<PREFIX>-TMP-<hex>` filename is still recognized.
 */
const TEMPORARY_DRAFT_HEAD = new RegExp(
  `^([A-Z]+)-${TEMPORARY_MARKER}-(?:${AUTHOR_SEGMENT}-)?[0-9a-f]+`,
);

/** The temporary id and prefix parsed from the head of a draft filename. */
export interface TemporaryDraftId {
  /** The full temporary id, e.g. `SW-TMP-TS-001`. */
  temporaryId: string;
  /** The lens or structural prefix, e.g. `SW`. */
  prefix: string;
}

/**
 * Parses the temporary id at the head of a draft filename, or undefined when the name
 * is not a draft. The one parser of the draft-filename form; promotion consumes it
 * rather than re-encoding the pattern.
 */
export function parseTemporaryDraftId(
  fileName: string,
): TemporaryDraftId | undefined {
  const match = TEMPORARY_DRAFT_HEAD.exec(fileName);
  if (match === null || match[1] === undefined) {
    return undefined;
  }
  return { temporaryId: match[0], prefix: match[1] };
}

/**
 * Every temporary-id token appearing anywhere in a body of text. Unanchored and
 * global, with the trailing run closed at a non-id character so a token is read
 * whole whether it stands alone, ends a slugged filename (`…-001-slug.md`), or
 * sits in prose. The grammar matches `parseTemporaryDraftId`, so an extracted
 * token equals the temporary id a draft filename parses to — letting promotion
 * resolve a reference between drafts by exact lookup.
 */
const TEMPORARY_ID_IN_TEXT = new RegExp(
  `[A-Z]+-${TEMPORARY_MARKER}-(?:${AUTHOR_SEGMENT}-)?[0-9a-f]+(?![0-9A-Za-z])`,
  "g",
);

/** Finds every temporary-id token in `content`, for resolving references between drafts. */
export function findTemporaryReferences(content: string): string[] {
  return content.match(TEMPORARY_ID_IN_TEXT) ?? [];
}

/**
 * Whether `type` uses the reserved marker as a hyphen-delimited segment. Segment-wise,
 * so `TMPX` is allowed while `TMP` and `MY-TMP` are not.
 */
export const typeUsesReservedMarker: (type: string) => boolean = realizes(
  ConTraceables.CON_008_TMP_MARKER_RESERVED,
  (type: string): boolean => type.split("-").includes(TEMPORARY_MARKER),
);
