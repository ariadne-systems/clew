**Title**
clew's reports surface the states a clean summary would hide

**Business Value**
clew's reports are how a reader — or an agent — knows where a project stands.
But three of them let a clean-looking summary stand for a state that is not done: coverage reports `20/20 covered` while four just-promoted specs sit planned and unbuilt, a glob waiver silently marks a spec covered that has no test, and promote finishes without saying a draft was left behind.
Each is a place the reader trusts a green summary that is hiding a gap — the opposite of what a traceability tool is for.
Making each report name what it hides keeps the summary honest, for every project.

**Problem / Context**
Three reports hide a not-done state behind a clean summary:
- Coverage's headline counts only the coverage universe — active specs (CON-020) — so promoting four planned specs leaves it reading `20 covered (20 specs)`, unchanged, and easily read as done when an increment is fully specified but unbuilt.
- A glob waiver absorbs every id it matches, including specs promoted after it was written; the report marks them covered without naming which ids the waiver stands in for, so a stale or over-broad waiver hides a real gap silently.
- Promote refuses a partial promotion of a story's own closure but has no notion of other files in the drafts location, so a draft it does not touch sits unmentioned after it runs.

**Solution Approach**
Make the three reports name what they currently hide, without changing any command's core behaviour.
- Coverage's report surfaces the planned count alongside covered — the specs outside the universe — so a specified-but-unbuilt increment cannot read as done (for example `20 covered · 4 planned, outside coverage`).
- The coverage report names the ids each waiver currently absorbs, and flags a glob waiver that has begun matching specs newer than the waiver itself — so a stale or over-broad waiver is visible, not silent.
- Promote closes by listing any files still under the drafts location, so a draft it left behind is reported, not lost.

**Acceptance Criteria**
- `clew coverage` reports the planned count — specs outside the coverage universe — distinctly from the covered count, so a project with planned-but-unbuilt specs does not read as fully done.
- The coverage report names the ids each waiver currently absorbs, and flags a glob waiver that matches a spec newer than the waiver itself.
- `clew promote` reports any files remaining under the drafts location after it finishes; a drafts location with nothing left reports nothing.
- Each report's core result is unchanged — only what it surfaces is added.
- Tests cover a planned spec in the headline, a waiver's absorbed ids, a waiver matching a newer spec, and promote leaving a draft behind.

**Out of scope**
- Changing coverage or waiver semantics (CON-020, CON-021) — the universe and waiver rules are unchanged; this surfaces them, it does not redefine them.
- Failing or gating on any of these — the reports inform; turning a planned count or a stale waiver into a non-zero exit is a separate policy decision.
- Auto-removing or promoting a leftover draft — promote reports it; acting on it stays the author's job.

## Relations

**Realizes** (new specs)

- [CON-037 — The coverage report states the planned count distinctly from covered](../specs/CON-037-coverage-report-shows-planned-count.md)
- [CON-038 — A coverage waiver's report names the ids it absorbs](../specs/CON-038-coverage-report-names-waiver-absorption.md)
- [CON-039 — Promotion reports the drafts it leaves behind](../specs/CON-039-promotion-reports-leftover-drafts.md)

**Related**

- Refines the report emitted by [SW-028 — Emit the coverage result as `coverage.json` and a human-readable report](../specs/SW-028-emit-coverage-result.md) and the command [SW-029 — The tool exposes a `coverage` command that reports coverage](../specs/SW-029-coverage-command.md).
- Refines the report of [SW-016 — The tool exposes a `promote` command that delegates to core](../specs/SW-016-promote-command.md).
