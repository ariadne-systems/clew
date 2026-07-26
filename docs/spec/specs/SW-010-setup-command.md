**Title**
The tool exposes a `setup` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `setup` command, invoked as `clew setup`, taking no positional arguments.
It accepts a `--generator <type>` option that selects the target generator to scaffold; an unknown value is rejected before anything is written (SW-039).
It accepts a `--agent <harness>` option selecting the harness the method scaffold is emitted for (SW-043); an unknown value is rejected.
The command's action carries no scaffolding logic of its own: it delegates to core's configuration scaffolding (SW-011) and reports what it wrote.
On success it writes a concise summary and next steps to standard output; on failure the error goes to standard error and the process exits non-zero, like every command.
An unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `setup` command's shape as its own spec gives that contract a stable id to check the command registration against, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`clew setup` is a registered subcommand and runs with no positional arguments.
An unknown option or an extra argument is rejected with a non-zero exit.
The command performs no scaffolding itself; it delegates to core and surfaces the result and any error through the standard streams.
The `--generator <type>` option is registered and its value forwarded to core.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

## Changes

- **2026-07-10** — The command surface gained a `--generator <type>` option, forwarded to core, which scaffolds the chosen generator (STR-029, SW-039).
The command stays thin; only its recognized-option set grew, so "no positional arguments" still holds.

- **2026-07-12** — The command surface gained a `--agent <harness>` option, forwarded to core, which emits the method scaffold for the chosen harness (STR-031, SW-043).
Still thin; only the recognized-option set grew.
