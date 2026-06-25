**Title**
A spec's status is one of the declared values

**Lens**: CON

**Description**
A spec's `**Status**` is one of `not-implemented`, `implemented`, or `deprecated`, or absent (meaning `not-implemented`).
An unrecognized value is rejected — the scan fails fast rather than guessing.

**Rationale**
A typo in a status must not silently drop a spec out of enforcement; rejecting it keeps the implementation state trustworthy.

**Verification Description**
Each declared value and an absent field are accepted; any other value is rejected with an error.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)
