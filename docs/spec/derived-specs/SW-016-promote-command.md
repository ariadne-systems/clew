**Title**
The tool exposes a `promote` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `promote` command, invoked as `clew promote <draft…>` or `clew promote all`.
Each argument names a draft to root the promotion at — a story (the common case, which carries its specs through its references) or a spec — and the keyword `all` promotes every pending draft and must be given alone.
At least one argument is required: invoked with none, the command is an error, never a finalize of whatever happens to be pending; `all` mixed with a named draft is likewise an error (CON-028).
The command's action carries no binding, substitution, or move logic of its own: it delegates to core's finalize (SW-017), which resolves the named roots' reference closure, binds each draft's id, substitutes its temporary id within the drafts, and moves it into the layout, and it reports each temporary-id → bound-id mapping.
On success it writes a summary to standard output; on failure the error goes to standard error and the process exits non-zero (SW-004), like every command.
A configuration is required (CON-011); an unrecognized option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `promote` command's shape as its own spec gives that contract a stable id to check the command registration against, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`clew promote` is a registered subcommand requiring at least one draft argument or the keyword `all`; invoked with no argument it errors with a non-zero exit.
An unknown option is rejected with a non-zero exit.
The command performs no binding, substitution, or move itself; it delegates to core and surfaces the result and any error through the standard streams.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)

**Related**

- Constrained by [CON-028 — A promotion is rooted at named drafts and finalizes their reference closure](CON-028-promotion-rooted-at-named-drafts.md) — the command names a draft (or `all`), never nothing.

## Changes

- **2026-06-28** — The command now requires at least one named draft (a story or a spec) or the keyword `all`; the no-argument "finalize all pending" form is removed (CON-028, STR-025).
Delegation is unchanged in kind — it still calls core's finalize — but finalize now resolves the named roots' closure rather than taking a flat pending list.
- **2026-06-28** — `all` must be the only argument; combined with a named draft the command is rejected rather than discarding the named draft.
