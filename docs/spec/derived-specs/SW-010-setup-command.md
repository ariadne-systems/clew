**Title**
The tool exposes a `setup` command that delegates to core

**Lens**: SW

**Description**
The tool exposes a `setup` command, invoked as `ariadne setup`, taking no positional arguments.
The command's action carries no scaffolding logic of its own: it delegates to core's configuration scaffolding (SW-011) and reports what it wrote.
On success it writes a concise summary and next steps to standard output; on failure the error goes to standard error and the process exits non-zero, like every command.
An unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `setup` command's shape as its own spec gives that contract a stable id to check the command registration against, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`ariadne setup` is a registered subcommand and runs with no positional arguments.
An unknown option or an extra argument is rejected with a non-zero exit.
The command performs no scaffolding itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)
