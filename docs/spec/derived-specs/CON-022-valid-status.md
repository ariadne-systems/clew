**Title**
A spec's status is one of the declared values

**Lens**: CON

**Status**: active

**Description**
A spec's `**Status**` is one of `planned`, `active`, or `deprecated`, or absent (meaning `planned`).
An unrecognized value is rejected — the scan fails fast rather than guessing.

**Rationale**
A typo in a status must not silently drop a spec out of enforcement; rejecting it keeps the implementation state trustworthy.

**Verification Description**
Each declared value and an absent field are accepted; any other value is rejected with an error.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)

## Changes

- **2026-06-26** — Renamed the status values to lifecycle terms: `not-implemented` → `planned`, `implemented` → `active` (`deprecated` unchanged).
"implemented" was wrong — a traceable is generated when work goes **active** (so code can anchor against it *during* implementation, not after it is done), and coverage already carries the built-vs-in-progress distinction. (`draft` was avoided: it already names an unpromoted spec in clew.)
