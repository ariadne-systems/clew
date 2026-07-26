**Title**
The tool exposes a `reconcile` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `reconcile` command, invoked as `clew reconcile`, taking no positional arguments.
The command's action carries no reconciliation logic of its own: it delegates to core's high-water-mark derivation (SW-006) and reports the outcome — each prefix whose mark it raised, or that the state already covered every id on disk.
On success it writes to standard output; on failure the error goes to standard error and the process exits non-zero, like every command.
An unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `reconcile` command's shape as its own spec gives that contract a stable id to check the command registration against and to document, and keeps the command thin: a registration point that dispatches to core and renders the result.
The name says what the command does — reconcile the id state with the ids already on disk — rather than `init`, which collided with `setup`, the command that actually initializes a project.

**Verification Description**
`clew reconcile` is a registered subcommand and runs with no positional arguments.
An unknown option or an extra argument is rejected with a non-zero exit.
The command performs no reconciliation itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

## Changes

- **2026-07-17** — Renamed the command and this spec from `init` to `reconcile`.
`init` was confusing: it read as project initialization, which is what `setup` does, while the command actually reconciles the id state's high-water marks with the ids already on disk (never lowering one, CON-009).
The **slug was pulled along** — `SW-007-init-command` → `SW-007-reconcile-command`, so the generated traceable renamed `SW_007_INIT_COMMAND` → `SW_007_RECONCILE_COMMAND` and its anchors were re-pointed — rather than kept, so the title and the anchored symbol tell the same story (`006` §2).
The command's behaviour is unchanged; only its name and this spec's wording moved.
