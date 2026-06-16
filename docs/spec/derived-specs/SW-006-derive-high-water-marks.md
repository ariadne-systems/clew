**Title**
Derive per-prefix high-water marks from existing artifacts

**Type**: SW

**Description**
Initialization discovers the ids present in the project's artifacts and, for each prefix, takes the highest number found as that prefix's high-water mark.
Ids are discovered by reading the artifact tree; a prefix with no artifacts gets no mark.
The discovered marks are written to the StateStore so that minting continues after them.

**Rationale**
The high-water mark is the StateStore's record of what has been allocated.
On adoption or recovery there is no such record yet, so it must be reconstructed from the artifacts that already carry ids — the only durable evidence of which numbers are in use.

**Verification Description**
Given a fixture whose artifacts are STR-001..007 and SW-001..005, initialization records STR=7 and SW=5.
A prefix absent from the artifacts records no mark.
A subsequent mint for SW yields SW-006.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
