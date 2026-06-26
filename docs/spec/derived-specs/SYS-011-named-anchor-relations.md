**Title**
The system anchors code to specs with a closed set of named relations, computed only from markers

**Lens**: SYS

**Status**: active

**Description**
The system shall represent code-to-spec anchors with a closed set of named relations — `realizes`, `verifies`, and `concerns` — and compute the trace graph only from those markers, never from prose comments.
The `concerns` relation is existence-checked and does not count as verification or toward coverage.

**Rationale**
A closed, named relation set keeps the trace graph legible and trustworthy; an open catch-all relation, or treating comments as traces, reintroduces the unverifiable assertions the approach exists to replace (ADR-0004).

**Verification Description**
Only the three relations are emitted and recognized; a spec id in a comment is not a trace; a `concerns` anchor checks existence but is excluded from coverage.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
