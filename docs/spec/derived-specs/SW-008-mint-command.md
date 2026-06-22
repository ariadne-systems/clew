**Title**
The tool exposes a `mint` command that delegates to core

**Lens**: SW

**Description**
The tool exposes a `mint` command, invoked as `ariadne mint <type> [count]`, where `count` is optional and defaults to 1.
It accepts a `-t`/`--tmp` option that selects temporary, unbound minting (SW-005) in place of the default bound minting.
The command's action carries no allocation or validation logic of its own: it delegates to core — bound minting by default, temporary minting under `--tmp` — and renders the returned ids to standard output in the line-oriented form defined by SW-003.
On failure the error goes to standard error and the process exits non-zero, like every command.
A missing `type`, an extra positional argument, or an unrecognized option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist, how each is invoked, and which options it accepts — is a contract that agents and scripts depend on, distinct from what a command computes or how it prints its result.
Anchoring the `mint` command's shape as its own spec gives that contract a stable id to check the command registration against and to document, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`ariadne mint` is a registered subcommand, invoked as `mint <type> [count]` with `count` defaulting to 1.
`-t` and `--tmp` are accepted and select temporary minting; without them, minting is bound.
The command performs no allocation or validation itself; it delegates to core and surfaces results and errors through the standard streams.
A missing `type`, an extra argument, or an unknown option is rejected with a non-zero exit.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)
