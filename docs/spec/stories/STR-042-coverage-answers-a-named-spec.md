**Title**
clew coverage answers whether a named spec is Covered, directly

**Status**: planned

**Business Value**
The implement step closes an increment by confirming its target specs reached Covered.
Today `clew coverage` prints only the corpus-wide summary, so confirming one spec means reading `coverage.json` by hand or inferring from the aggregate count — friction an autonomous demo run hit on every increment.
A direct per-spec answer makes the closing check legible and cheap.

**Problem / Context**
`clew coverage` reports the whole corpus: a count per status, the gaps, and the waived.
It has no way to ask about a single spec, so to confirm that (say) SW-001 is Covered you either scan `coverage.json` or read the aggregate and hope.
In the reservations demo the agent hit this repeatedly, inspecting `coverage.json` by hand to verify a targeted spec had closed.

**Solution Approach**
Let the coverage command take spec ids and report each named spec's status directly, as a **read-only query** — it prints only the named specs and does not write `coverage.json`; that whole-corpus file is written only by the bare command.
The command stays thin and informational (it still exits 0 regardless), consistent with the bare form.
The `clew-implement` skill then adopts it: its verify step confirms each targeted spec with `clew coverage <ID>`, closing the friction that prompted this increment.

**Acceptance Criteria**
- `clew coverage <id…>` reports each named spec's status (realized, verified, Covered, none, or deprecated, and a waived spec's status with its reason).
- An id not in the coverage universe — a `planned` spec that generates no traceable, or an unknown id — is reported as absent, not silently dropped.
- A per-spec query does not write `coverage.json` — an existing file is left untouched — and the command still exits 0 when a named spec is uncovered.
- The `clew-implement` skill's verify step confirms each targeted spec with `clew coverage <ID>`, rather than reading the aggregate report or `coverage.json` by hand — changed in the source skill and its shipped template together.

**Out of scope**
- A machine `--json` per-spec shape — the shared `coverage.json` already serves machine consumers.
- Turning any per-spec result into a pass/fail gate — that remains the later gate story.
- Changing the aggregate report's format.

## Relations

**Realizes**

- [SW-051](../specs/SW-051-coverage-reports-named-specs.md) — the per-spec coverage view this increment delivers

**Related**

- [SW-029](../specs/SW-029-coverage-command.md) — the coverage command this extends
- [SW-028](../specs/SW-028-emit-coverage-result.md) — the whole-corpus report and `coverage.json` write, which stays the bare command's job
