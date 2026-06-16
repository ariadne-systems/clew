# ADR-0002: Stable, mnemonic error codes

- Status: Accepted.
- Date: 2026-06-16
- Deciders: Thorsten (solo).

## Context

The tool is driven by agents and CI and is heading for open source.
A failure currently surfaces only as a human-readable message and a process exit code.
The exit code is too coarse to tell failures apart, and once the tool is open-sourced the message text becomes a de-facto API: any consumer that matches on it breaks the moment the wording is improved.

There is no stable, rewording-proof way to identify a failure programmatically, and no durable anchor for documentation or enterprise support triage.

## Decision

A failure is represented by a typed error, `AriadneError`, that carries a machine-readable `code` alongside its human-readable message (ARCH-002).
Domain errors originate in the language-neutral core and carry their code; the CLI renders a failure as `error[<CODE>]: <message>` on stderr and exits non-zero (SW-004).

Codes are **mnemonic, uppercase strings** (for example `E_INVALID_COUNT`), not numeric.
Mnemonic codes are self-documenting and greppable, and need no central numeric registry or pre-allocated ranges.

A released code is **stable**: never reused for a different condition and never renamed (CON-006).
The set of codes grows additively, one code per real error condition as it arises — not as an upfront taxonomy.
Retiring a code means deprecating it, not repurposing or removing it; a rename or repurpose is a breaking change.

The full set of codes is documented in one place, `docs/errors.md`.

### Rejected alternatives

Numeric codes (for example `ARIADNE-1001`): language-neutral and compact, but they require a maintained lookup table to be meaningful and are easy to misnumber. Mnemonic codes carry their meaning in the token.

Matching on message text: not a contract — it breaks on every rewording and cannot be localized.

Mapping codes to distinct process exit codes: deferred. The exit stays non-zero for now; a code-to-exit mapping can be layered on later without changing the codes.

Structured/JSON error output: deferred to its own story if a machine consumer needs more than the coded stderr line.

## Consequences

Automation and CI can branch on a stable code instead of parsing prose.
Wording can be improved freely without breaking consumers, because the code is the contract.
Enterprise support and open-source users get a durable anchor for documentation and triage.

The cost is a small, ongoing discipline: every new error condition mints a new mnemonic code and documents it, and released codes are treated as a stability contract — the same never-reuse discipline the tool applies to its traceable ids (CON-002).
