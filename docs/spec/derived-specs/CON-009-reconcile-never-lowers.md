**Title**
Reconciliation never lowers a high-water mark

**Lens**: CON

**Description**
Initialization only raises a prefix's high-water mark to cover a discovered id; it never lowers an existing mark.
If the recorded mark is already at or above every discovered id for a prefix, it is left unchanged.

**Rationale**
A number, once allocated, is never reused (CON-002).
Lowering a mark would re-hand a number that may already be bound — including allocations not visible as committed artifacts — so reconciliation must be monotonic: it can only catch the state up, never roll it back.

**Verification Description**
Given a recorded mark SW=9 and artifacts only up to SW-005, initialization leaves SW=9 unchanged.
Given a recorded mark SW=3 and artifacts up to SW-005, initialization raises SW to 5.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
