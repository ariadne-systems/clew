**Title**
The system detects a spec reference that bypasses the anchor

**Lens**: SYS

**Description**
The system shall detect, mechanically, a code-to-spec reference that is not an anchor — a spec id appearing in a comment or a name rather than inside a `realizes` / `verifies` / `concerns` anchor — and report it located, so a reference the compiler cannot see is caught rather than left to rot.

**Rationale**
The compiler guarantees the anchor symbol cannot go stale (SYS-001), but it does not see a spec id written in prose; such a reference is unchecked and drifts silently.
Detecting it is what extends the no-silent-rot guarantee to the references the compiler is blind to.

**Verification Description**
Given code whose spec reference is a hyphenated id in a comment, the system reports it with its location; given code whose only reference is an anchor, the system reports nothing.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
