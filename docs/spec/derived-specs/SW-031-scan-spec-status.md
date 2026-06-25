**Title**
The spec scan reads each spec's implementation state

**Lens**: SW

**Description**
The spec scan reads each spec's `**Status**` field — `not-implemented`, `implemented`, or `deprecated` — onto its traceable.
A spec with no `**Status**` field is `not-implemented`.

**Rationale**
Coverage scopes itself by implementation state, so the scan that produces the traceables is where the state must be captured — once, alongside the id and lens.

**Verification Description**
A spec with `**Status**: implemented` yields a traceable with that state; `deprecated` yields deprecated; an absent field yields not-implemented.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)
