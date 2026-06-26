**Title**
The tool exposes a `spec` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `spec` command, invoked as `ariadne spec`, taking no positional arguments.
The command's action carries no scanning or generation logic of its own: it delegates to core, which scans the configured artifacts and drives the configured generators (SW-013, SW-014), and reports what it produced.
On success it writes a summary to standard output; on failure the error goes to standard error and the process exits non-zero, like every command.
A configuration is required (CON-011); an unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `spec` command's shape as its own spec gives that contract a stable id to check the command registration against, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`ariadne spec` is a registered subcommand and runs with no positional arguments.
An unknown option or an extra argument is rejected with a non-zero exit.
The command performs no scanning or generation itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)
