**Title**
State access is mutually exclusive across processes

**Type**: NF

**Description**
Only one process may hold an open state session at a time.
A session takes a cross-process lock when it opens and releases it when it closes, so that read, mutate, and save never interleave with another session.

**Rationale**
Authoring steps or scripts may run in parallel.
Without mutual exclusion a read-modify-write race could lose an update or corrupt the state.

**Verification Description**
While one session holds the store, a second open blocks or fails rather than proceeding alongside it.
Many sessions run against the same state produce a result consistent with serial execution.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
