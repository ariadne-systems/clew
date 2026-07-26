**Title**
A sequence number is never reused

**Lens**: CON

**Status**: active

**Description**
Once a number has been allocated for a prefix it is never allocated again — across separate invocations, after a restart, and over the lifetime of the repository.
The high-water mark is persisted so allocation always continues from where it stopped.

**Rationale**
A reused id breaks traceability: two different elements would bear the same id.
Persisting the high-water mark is what makes "already used" durable and shared across a team.

**Verification Description**
Allocations made in separate invocations never overlap.
Discarding in-memory state while keeping the persisted file continues after the last allocated number, never before it.

## Relations

**Concerns**

- [ENT-001](../domain-model.md#ent-001-clewstate)
