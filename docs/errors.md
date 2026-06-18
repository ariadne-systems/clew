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
