**Title**
A command requires a project configuration and directs the user to setup

**Lens**: CON

**Description**
A command that allocates or reconciles ids — `mint`, `init` — requires a project configuration to be present.
When no `.ariadnerc.json` exists, the command makes no change and fails with an explicit error that directs the user to run `ariadne setup`, with a non-zero exit.
This is a command-level precondition; the core config readers still default an absent value within a *present* configuration (SW-009).

**Rationale**
Requiring an explicit configuration turns the first interaction into a deliberate setup moment, where the project chooses its lenses rather than drifting into the defaults on the first mint.
Defaulting silently would commit the first ids to a lens set the project never chose; failing toward `setup` makes the choice explicit and gives a place to guide it.
This matches how project tools (git, terraform, npm) require an explicit init before they operate.

**Verification Description**
In a project with no `.ariadnerc.json`, `mint` and `init` fail with an explicit error naming `ariadne setup` and a non-zero exit, and allocate or change nothing.
With a configuration present, the commands run normally.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
