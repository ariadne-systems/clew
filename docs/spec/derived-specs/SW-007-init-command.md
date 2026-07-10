**Title**
The tool exposes an `init` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes an `init` command, invoked as `clew init`, taking no positional arguments.
The command's action carries no reconciliation logic of its own: it delegates to core's high-water-mark derivation (SW-006) and reports the outcome.
On success it writes to standard output; on failure the error goes to standard error and the process exits non-zero, like every command.
An unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `init` command's shape as its own spec gives that contract a stable id to check the command registration against and to document, and keeps the command thin: a registration point that dispatches to core and renders the result.

**Verification Description**
`clew init` is a registered subcommand and runs with no positional arguments.
An unknown option or an extra argument is rejected with a non-zero exit.
The command performs no reconciliation itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)
