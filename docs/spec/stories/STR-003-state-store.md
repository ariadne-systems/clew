**Title**
Lock and persist the tool's state in a version-controlled file

**Business Value**
The tool's stateful data — sequence counters now, more later — needs one durable, shared, race-safe home.
A small StateStore that owns the file, the lock, and atomic writes is the foundation every stateful feature builds on.
It is also the compile-checked-shape idea the tool sells, applied to its own state.

**Problem / Context**
Several features will read and update persistent state: sequence high-water marks now, a last-scanned commit later.
That state must be durable, shared through git, and safe against concurrent access.
There is no such store today, and no fixed shape for the state.

**Solution Approach**
Model the state as the domain entity AriadneState (ENT-001): a map of sections, the first being `sequences`.
Add a StateStore in `@ariadne-thread/core` that owns the persistence of that entity in a committed JSON file (default `.ariadne/state.json`).
A session opens by acquiring a cross-process lock (proper-lockfile) and reading the file into an AriadneState, hands that state to the caller to read and mutate, then saves it atomically (temp file plus rename) and releases the lock.
A save preserves every section, including ones the caller did not touch.
The store carries no domain logic — it knows the entity's shape, not what any section means.

**Acceptance Criteria**
- A session acquires the lock and reads the current state on open, and releases the lock on close, including on error.
- The state file is JSON shaped as the AriadneState entity (a map of sections) and is committed to the repository.
- A save preserves every existing top-level section, not only the ones the caller changed.
- A crash midway through a save cannot leave the file corrupted (atomic write).
- Two sessions cannot hold the store at the same time; concurrent access is serialized.
- A missing file is treated as an empty AriadneState.
- The store exposes only load, mutate, and save of the entity; it carries no domain logic.
- Vitest covers open/lock/read, atomic save, section preservation, the missing-file case, and serialized concurrent access.

**Out of scope**
- Sequence allocation and minting (a later story).
- Any non-sequence section; the shape merely allows for them.

## Relations

**Realizes**

- [CON-001 — The tool's state is a single version-controlled file](../derived-specs/CON-001-state-file-version-controlled.md)
- [NF-001 — State access is mutually exclusive across processes](../derived-specs/NF-001-state-access-mutually-exclusive.md)
- [NF-002 — A state write is atomic](../derived-specs/NF-002-atomic-state-write.md)

**Persists**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
