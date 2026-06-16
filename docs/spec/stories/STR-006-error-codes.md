**Title**
Identify errors with stable, machine-readable codes

**Business Value**
The tool is driven by agents and CI and is heading for open source.
A failure needs a stable identifier that automation can branch on and that survives rewording, translation, and releases.
Stable codes also give enterprise support and open-source users a durable anchor for documentation and triage.

**Problem / Context**
Errors today are plain `Error` messages — an invalid mint count, a type that does not match the configured pattern, a failed state write.
The only machine-readable signal is the process exit code, which is too coarse to tell failures apart.
Once the tool is open-sourced, the message text becomes a de-facto API: any consumer that matches on it breaks the moment the wording is improved.
There is no stable, rewording-proof way to identify a failure.

**Solution Approach**
Introduce a typed error in core — `AriadneError` — that carries a stable `code` alongside its human-readable message (ARCH-002).
Domain errors originate in core and carry their code; the CLI reports failures as `error[E_INVALID_COUNT]: <message>` on stderr and exits non-zero (SW-004), so the code is the contract and the message stays free to improve.
Codes are mnemonic, uppercase strings (for example `E_INVALID_COUNT`), minted only as real error conditions arise — never as an upfront taxonomy and never as numeric ranges.
Each released code is stable: never reused for a different condition and never renamed (CON-006); the set grows additively, with deprecation rather than mutation.
Apply this to the error conditions that exist today: an invalid mint count, a type that does not match the configured pattern (CON-005), and a failed state write (CON-004).
Document every code in one place so users and support can look it up, and record the decision — mnemonic codes, core-owned, stability contract — in a new ADR alongside ADR-0001.

**Acceptance Criteria**
- A typed error type in core carries a stable `code` and a human-readable message.
- Each existing failure carries a distinct, stable code: an invalid count, an invalid type, and a failed state write.
- The CLI renders the code together with the message in a consistent format and exits non-zero.
- A consumer can identify a failure by its code without parsing the message text.
- Codes are mnemonic strings; there is no numeric registry and no pre-allocated ranges.
- The full set of codes is documented in one place.
- Released codes are never reused or renamed; a renamed or repurposed code is treated as a breaking change.
- Vitest covers: each error carries its expected code, and the CLI output includes the code.

**Out of scope**
- Structured or JSON error output for machine consumers — a later story if needed.
- Mapping codes to distinct process exit codes; the exit stays non-zero for now.
- Localization of messages.
- Codes for conditions that do not yet exist.

## Relations

**Realizes**

- [ARCH-002 — Errors are identified by a stable, typed code](../derived-specs/ARCH-002-stable-error-codes.md)
- [SW-004 — Errors are reported with their code](../derived-specs/SW-004-error-reporting.md)
- [CON-006 — An error code is stable: never reused or renamed once released](../derived-specs/CON-006-error-code-stability.md)
