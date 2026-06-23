**Title**
Emit the coverage result as `coverage.json` and a human-readable report

**Lens**: SW

**Description**
The result is emitted as **`coverage.json`** in the shared shape (ADR-0005 D6) — each spec's id, lens, and coverage status, with the reason for waived ones — and as a human-readable report.
`coverage.json` is written atomically and replaces any existing file wholesale.

**Rationale**
A person reads the report and another tool reads `coverage.json`; emitting both from one classification keeps them consistent.
The atomic, wholesale write keeps the file trustworthy — a crash never leaves a partial result a later step would trust.

**Verification Description**
`coverage.json` is written in the shared shape and replaced wholesale; an interrupted run leaves the previous file intact.
The report states the count per status, the gaps, and the waived.

## Relations

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
- [SYS-013 — Shared configuration and output schemas](SYS-013-shared-schemas.md)
