**Title**
The `config` command is read-only

**Lens**: CON

**Status**: active

**Description**
The `config` command only reads and reports: it writes no file, advances no id state, and regenerates nothing.
Resolving and printing the configuration has no side effect, so the command is safe to run at any time and as often as a caller needs — in particular, an authoring skill may call it to discover the resolved view without changing the project.
This distinguishes `config` from `spec`, which also reports each generator's resolved output directory but does so while regenerating the tool-owned files (CON-012).

**Rationale**
A command whose purpose is to *describe* the project must not change it; a describe command with side effects cannot be called freely, which is exactly what its callers — skills resolving the project before they act — need to do.
Keeping `config` side-effect-free makes it the safe, repeatable way to read the resolved configuration, separate from the commands that act on the project.

**Verification Description**
Running `clew config`, with or without `--json`, creates, modifies, and deletes no file, advances no id state, and triggers no generation.
Run twice in succession, the project is byte-for-byte unchanged.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)
