**Title**
The system reports failures with stable, machine-readable codes

**Lens**: SYS

**Status**: active

**Description**
The system shall report failures with stable, machine-readable codes, so automation and users can branch on a failure's identity rather than its message text.

**Rationale**
A failure that can only be recognized by its prose is not something a script — or a tired developer — can rely on; a stable code is the failure's identity, and keeps integrations from breaking when wording changes (ADR-0002).

**Verification Description**
Each failure carries a stable code; a released code is never reused for a different condition and its string value never changes across releases, though the message may.

## Relations

**Realizes**

- [STK-007 — Scriptable and supportable diagnostics](STK-007-scriptable-diagnostics.md)
- [STK-003 — Low authoring friction](STK-003-low-authoring-friction.md)
