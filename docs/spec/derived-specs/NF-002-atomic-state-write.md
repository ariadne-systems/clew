**Title**
A state write is atomic

**Lens**: NF

**Status**: active

**Description**
Saving the state either fully succeeds or leaves the previous file intact.
A process that crashes during a save never leaves a partially written or corrupt file.

**Rationale**
The state is the source of truth; a half-written file would be worse than a stale one.
Writing to a temporary file and renaming it into place makes the swap atomic.

**Verification Description**
Interrupting a save leaves the prior file readable and valid.
After a successful save the file contains the complete new state.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
