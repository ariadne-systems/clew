**Title**
The system allocates unique, stable, persistent spec ids

**Lens**: SYS

**Status**: active

**Description**
The system shall allocate unique, stable, persistent ids for specs, and never reuse an id for a different spec.

**Rationale**
Every trace — forward and reverse — is keyed on the spec id; if ids are unstable or reused, the whole graph becomes unreliable.
Stable identity is the foundation the rest stands on (ADR-0001 D2, D3).

**Verification Description**
Allocating ids yields distinct values; a released id is never reissued; the allocation survives across invocations.

## Relations

**Realizes**

- [STK-001](STK-001-implementation-assurance.md)
- [STK-004](STK-004-traceability-with-the-code.md)
