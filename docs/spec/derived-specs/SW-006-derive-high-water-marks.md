**Title**
Derive per-prefix high-water marks from existing artifacts

**Lens**: SW

**Status**: active

**Description**
Initialization discovers the bound ids in the project's configured artifact directories (the layout, ENT-002) and, for each configured prefix, takes the highest number found as that prefix's high-water mark.
Only configured prefixes are counted, so a non-lens file such as an ADR is ignored, and a prefix with no artifacts gets no mark.
The discovered marks are written to the StateStore so that minting continues after them.

**Rationale**
The high-water mark is the StateStore's record of what has been allocated.
On adoption or recovery there is no such record yet, so it must be reconstructed from the artifacts that already carry ids — the only durable evidence of which numbers are in use.

**Verification Description**
Given a fixture whose artifacts are STR-001..007 and SW-001..005, initialization records STR=7 and SW=5.
A prefix absent from the artifacts records no mark, and a file whose prefix is not configured is not counted.
A subsequent mint for SW yields SW-006.

## Relations

**Concerns**

- [ENT-001 — ClewState](../domain-model.md#ent-001-clewstate)
- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-003 — Stable spec identity](SYS-003-stable-spec-identity.md)
