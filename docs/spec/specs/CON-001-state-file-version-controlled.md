**Title**
The tool's state is a single version-controlled file

**Lens**: CON

**Status**: active

**Description**
The tool keeps its persistent state in one JSON file inside the repository, committed to version control.
That file is the single source of truth for the state and is shared with the team through git.

**Rationale**
A committed file makes the state durable and shared with no server.
One file keeps the lock, the diff, and the merge surface simple.

**Verification Description**
The state is read from and written to one file within the repository.
The file is tracked by git, and nothing outside it holds authoritative state.

## Relations

**Concerns**

- [ENT-001 — ClewState](../domain-model.md#ent-001-clewstate)
