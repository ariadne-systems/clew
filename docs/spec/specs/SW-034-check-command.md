**Title**
clew exposes a `check` command that runs the integrity-check suite

**Lens**: SW

**Status**: active

**Description**
clew exposes a `check` command that runs the project's deterministic integrity checks over the corpus and the anchors, reports every violation with its location, and exits non-zero when any check fails.
The command is a thin runner: each check is a module reusing existing core plumbing — the scan, draft parsing, the located-anchor record — and the runner aggregates their findings and sets the exit code.
A clean corpus exits zero with no findings.

**Rationale**
The integrity the markers promise is only real if something checks it on every change; a documented convention or a repo-local script does neither portably.
One command makes the checks runnable in pre-commit, CI, or by any agent, and gives the suite a single place to grow.

**Verification Description**
On a corpus with a planted violation — a dangling relation link, a leftover temporary id, an invalid status, a spec id in a comment, or a duplicate id — `clew check` reports it and exits non-zero.
On a clean corpus it exits zero with no findings.

## Relations

**Realizes**

- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)

**Related**

- Conforms to [ARCH-005 — Deterministic integrity checks are one shipped `clew check` suite](ARCH-005-checks-are-one-suite.md).
- Enforces [CON-014 — exhaustive substitution](CON-014-exhaustive-substitution.md), [CON-022 — valid status](CON-022-valid-status.md), and the new [CON-026](CON-026-spec-id-only-in-anchor.md) and [CON-025](CON-025-one-file-per-spec-id.md) as checks.
- Reads the located-anchor record of [SYS-002 — reverse traceability](SYS-002-reverse-traceability-coverage.md).
