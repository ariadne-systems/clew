<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# Error codes

`ariadne` reports a failure to standard error as `error[<CODE>]: <message>` and exits with a non-zero status (SW-004).

The **code** is the stable identity of the failure (ARCH-002): automation should branch on the code, not on the message text.
A released code is never reused for a different condition and never renamed (CON-006); the message may change between releases, the code does not.

| Code | Meaning |
| --- | --- |
| `E_INVALID_COUNT` | The requested mint count is not a positive whole number. |
| `E_INVALID_TYPE` | The requested prefix is not a configured prefix (a lens id, or the story/entity prefix). |
| `E_STATE_WRITE_FAILED` | The state file could not be written. |
| `E_RESERVED_TYPE` | The requested type uses the reserved temporary-id marker `TMP` as a `-`-delimited segment. |
| `E_NO_CONFIG` | No project configuration was found; run `ariadne setup` to create one. |
| `E_UNKNOWN_GENERATOR` | The configuration names a generator that is not registered; remove it from `generators` or install a generator that provides it. |
| `E_SPEC_SET_OVERLAP` | A traceable matches more than one configured spec set; adjust the patterns so each spec matches exactly one set. |
| `E_SPEC_SET_UNMATCHED` | A traceable matches no configured spec set; add a matching set, an `ignore` pattern, or a catch-all set. |
| `E_DRAFT_NOT_FOUND` | A draft named for `promote` was not found among the pending drafts. |
| `E_ENTITY_DRAFT_UNSUPPORTED` | An entity draft cannot be finalized by `promote`; merge it into the domain model by hand. |
| `E_INVALID_EXCLUSION_PATTERN` | A configured `exclude` or `unexclude` glob could not be compiled; fix the named pattern. |
| `E_INVALID_SPEC_STATUS` | A spec declares a `**Status**` value that is not one of `planned`, `active`, or `deprecated`. |
| `E_INVALID_AUTHOR` | A draft author (`--as` or `CLEW_DRAFT_AUTHOR`) is not letter-led and uppercase (`[A-Z][A-Z0-9]*`). |
| `E_INVALID_OPTIONS` | Command options are combined invalidly, for example `--as` passed without `--tmp`. |
| `E_DUPLICATE_SPEC_ID` | Two files declare the same bound spec id; each id must be declared by exactly one file. |
