**Title**
The tool exposes a `mint` command that delegates to core

**Lens**: SW

**Status**: active

**Description**
The tool exposes a `mint` command, invoked as `clew mint <type> [count]`, where `count` is optional and defaults to 1.
It accepts a `-t`/`--tmp` option that selects temporary, unbound minting (SW-032) in place of the default bound minting, and an `--as <author>` option that namespaces those temporary ids, falling back to `CLEW_DRAFT_AUTHOR`.
The command's action carries no allocation or validation logic of its own: it delegates to core — bound minting by default, temporary minting under `--tmp` — and renders the returned ids to standard output in the line-oriented form defined by SW-003.
On failure the error goes to standard error and the process exits non-zero, like every command.
A missing `type`, an extra positional argument, or an unrecognized option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist, how each is invoked, and which options it accepts — is a contract that agents and scripts depend on, distinct from what a command computes or how it prints its result.
Anchoring the `mint` command's shape as its own spec gives that contract a stable id to check the command registration against and to document, and keeps the command thin: a registration point that dispatches to core.

**Verification Description**
`clew mint` is a registered subcommand, invoked as `mint <type> [count]` with `count` defaulting to 1.
`-t` and `--tmp` are accepted and select temporary minting, and `--as <author>` namespaces the temporary ids; without them, minting is bound.
`--as` outside temporary minting — passed without `--tmp` — is rejected with a non-zero exit rather than silently ignored.
The command performs no allocation or validation itself; it delegates to core and surfaces results and errors through the standard streams.
A missing `type`, an extra argument, or an unknown option is rejected with a non-zero exit.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)

## Changes

- **2026-06-26** — STR-021 will extend the command with an `--as <author>` option (resolved by SW-032), added when that story is implemented; the current surface is otherwise unchanged.
- **2026-06-26** — STR-021 is implemented: the `--as <author>` option (falling back to `CLEW_DRAFT_AUTHOR`) is now part of the command, and temporary minting is per-author (SW-032).
- **2026-06-27** — A review surfaced that `--as` without `--tmp` was silently ignored; it is now rejected. Recorded the option's mode-dependence in the verification.
