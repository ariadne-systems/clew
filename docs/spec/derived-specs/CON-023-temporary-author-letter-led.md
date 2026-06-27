**Title**
A temporary id's author postfix is letter-led, never bare digits

**Lens**: CON

**Status**: active

**Description**
When a temporary id carries an author postfix, that postfix is **letter-led** — `[A-Z][A-Z0-9]*`: uppercase, beginning with a letter, never bare digits.
This keeps the optional postfix unambiguous against the number, so `SW-TMP-001` parses as number-only and `SW-TMP-TS-001` as author-then-number, with no id readable as either.
A `--as` author that is not letter-led — a bare number, or otherwise outside `[A-Z][A-Z0-9]*` — is rejected before any id is produced.

**Rationale**
The author postfix is optional, so the segment after `-TMP-` is either `<NNN>` or `<AUTHOR>-<NNN>`.
A letter-led author cannot be confused with the digit-only number, so one split parses both forms deterministically — the property that lets the postfix be omitted in the solo case without ambiguity.

**Verification Description**
`SW-TMP-001` is parsed as number-only and `SW-TMP-TS-001` as author + number.
A `--as` author that is not letter-led (for example `--as 12`) is rejected before any id is minted.

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](SYS-005-spec-lifecycle.md)
