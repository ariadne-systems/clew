**Title**
Allocate consecutive sequence numbers for a prefix

**Type**: SW

**Description**
Given a prefix and a count, the allocator returns that many consecutive numbers that have not been allocated before for that prefix.
A prefix used for the first time begins at 1.
The returned numbers follow the prefix's current high-water mark, which then advances by the count.

**Rationale**
Sequential ids need a monotonic per-prefix counter.
Batch allocation lets an authoring step request many ids in a single call instead of one process invocation per id.

**Verification Description**
Allocating a count of N for a fresh prefix returns 1..N.
A subsequent allocation of M for the same prefix returns N+1..N+M.
A prefix never seen before is created automatically, with no prior registration.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
