**Title**
The tool exposes a `promote` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `promote` command, invoked as `ariadne promote [draft…]`, where each optional argument names a draft to finalize; with no argument it finalizes all pending drafts in the configured drafts location.
The command's action carries no binding, substitution, or move logic of its own: it delegates to core's finalize (SW-017), which binds each draft's id, substitutes its temporary id project-wide, and moves it into the layout, and it reports each temporary-id → bound-id mapping.
On success it writes a summary to standard output; on failure the error goes to standard error and the process exits non-zero (SW-004), like every command.
A configuration is required (CON-011); an unrecognized option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `promote` command's shape as its own spec gives that contract a stable id to check the command registration against, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`ariadne promote` is a registered subcommand, invoked with zero or more draft arguments.
An unknown option is rejected with a non-zero exit.
The command performs no binding, substitution, or move itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)
