**Title**
clew coverage reports the status of each spec id it is given

**Lens**: SW

**Status**: planned

**Description**
Given one or more spec ids, `clew coverage <id…>` reports each named spec's coverage status directly — realized, verified, Covered, none, or deprecated, and a waived spec's status with its waiver reason — instead of only the corpus-wide summary.
An id not in the coverage universe — a `planned` spec that generates no traceable, or an unknown id — is reported as absent, not silently omitted.
It is a **read-only query**: it prints only the named specs and does **not** write `coverage.json` — that whole-corpus file is written only by the bare `clew coverage` (SW-028).
Like that command it is informational and exits 0 whether or not a named spec is Covered.

**Rationale**
The implement step closes an increment by confirming its target specs reached Covered; today that means reading `coverage.json` by hand or inferring from the aggregate count.
A direct per-spec query makes the closing check legible without parsing the shared file, and making it read-only keeps the query a peek — the whole-corpus `coverage.json` is produced only by the assurance run, never rewritten as a side effect of asking about one spec.

**Verification Description**
`clew coverage SW-001` reports SW-001's status and only it: a Covered spec reads Covered, a partially anchored one reads realized or verified, a waived one reads its status with the reason.
An id absent from the universe is reported as absent, not dropped.
A per-spec query writes no `coverage.json` — an existing file is left untouched — and still exits 0 when the named spec is uncovered.

## Relations

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)

**Related**

- [SW-029](SW-029-coverage-command.md) — the coverage command this filters
- [SW-028](SW-028-emit-coverage-result.md) — the whole-corpus report and wholesale `coverage.json` write this must not truncate
