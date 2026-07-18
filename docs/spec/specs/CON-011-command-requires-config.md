**Title**
A command requires a project configuration and directs the user to setup

**Lens**: CON

**Status**: active

**Description**
A command that allocates or reconciles ids, generates from the specs, or finalizes drafts — for example `mint`, `reconcile`, `spec`, and `promote` — requires a project configuration to be present; `setup`, which creates the configuration, is the exception.
When no `.clewrc.json` exists, the command makes no change and fails with an explicit error that directs the user to run `clew setup`, with a non-zero exit.
This is a command-level precondition; the core config readers still default an absent value within a *present* configuration (SW-009).

**Rationale**
Requiring an explicit configuration turns the first interaction into a deliberate setup moment, where the project chooses its lenses rather than drifting into the defaults on the first mint.
Defaulting silently would commit the first ids to a lens set the project never chose; failing toward `setup` makes the choice explicit and gives a place to guide it.
This matches how project tools (git, terraform, npm) require an explicit init before they operate.

**Verification Description**
In a project with no `.clewrc.json`, a command that requires configuration — such as `mint`, `reconcile`, `spec`, or `promote` — fails with an explicit error naming `clew setup` and a non-zero exit, and allocates or changes nothing.
With a configuration present, the commands run normally.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

## Changes

- **2026-07-17** — Updated the example command list, `init` → `reconcile`, for the command's rename (SW-007).
A referenced-name rename; the constraint is unchanged.
