**Title**
Refine the waiver list — match by pattern, and waive only a missing test

**Business Value**
The waiver list (STR-018) accepts a not-Covered spec whole, by id: "this spec is not Covered, and that is fine."
Two things make it noisier than the reviewed inventory it should be:
- A class that can never be Covered — stakeholder needs (`STK`), for which no honest automated test exists — must be waived one id at a time, and every newly minted one is an open gap until someone adds another line.
- A whole-spec waiver can hide a spec that has *no thread to code at all* (a `None`) just as easily as one that is merely untested — suppressing the strongest signal the report has.

This story makes a waiver match by **pattern** — so a structurally-untestable class is accepted in one reviewed entry — and waive **only a missing test**: a waiver accepts a spec that is implemented but unverified, and can never hide a spec that is missing its implementing code.

**Problem / Context**
A waiver is `{ id, reason }` and accepts any not-Covered spec it names.
`STK` can never be verified, so they are Realized forever and each needs its own waiver; a new `STK` nags until then.
And a single-id waiver landing on a `None` spec hides a spec with no anchor to code at all — exactly what the report exists to surface.

**Solution Approach**
- A waiver entry targets an `id` **or** a `pattern` — a glob over spec ids (for example `STK-*`).
- A waiver waives the **verify** requirement only. It marks a spec **waived** when the spec is missing exactly its test — `Realized` (implemented, not verified). A spec missing its implementing code — `None`, or the rare verify-only — is **never** waivable and stays an open gap.
- Stale generalises: a waiver — id or pattern — that matches no spec it could waive (nothing, or only specs already Covered or missing their realize) is reported stale.

**Acceptance Criteria**
- A waiver with `pattern: "STK-*"` reports every Realized `STK-…` as waived, and a `None` `STK-…` (such as STK-005) as an open gap.
- A waiver never waives a `None` spec, by id or by pattern.
- A waiver `{ id, reason }` for a Realized spec waives it; for a Covered spec or an unknown id it is stale.
- `concerns` alone never makes a spec Covered (CON-019), so a `concerns`-only spec is `None` and unwaivable.
- A waiver — id or pattern — matching no waivable spec is reported stale.
- Vitest covers: a pattern over several ids, a Realized spec waived, a `None` spec left as a gap under both an id and a pattern waiver, and a stale id and a stale pattern.

**Decisions**
- **A waiver waives only a missing test** — accepting "no implementing code" is always hiding a real gap, so missing-realize is unwaivable by construction (CON-021). A `None` spec stays visible without depending on the author scoping the waiver correctly.
- **Pattern for a structural class, id for a one-off** — `STK-*` waives the lens that is structurally unverifiable; `SYS-001` waives an individual exception. A pattern is a flat glob over ids — no spec→spec graph.
- **No `waive`-relation field** — there is exactly one honest thing to waive (the test), so a waiver carries no relation list; the rule is encoded, not chosen.
- **This changes the bare waiver's meaning** — today `{ id, reason }` can hide any not-Covered spec; now it waives only a missing test. No waivers are configured yet, so nothing breaks.

**Out of scope**
- The coverage **gate** — its own later story; it reads what this reports as waived.
- Any spec→spec relation graph; patterns are a flat glob over ids.
- A `deprecated` spec — that is the `**Status**` field's job, not a waiver.
- Suggesting or generating waivers.

## Relations

**Realizes** (temporary ids; bound and substituted on promotion)

- [SW-030](../specs/SW-030-waiver-match-by-id-or-pattern.md)
- [CON-021](../specs/CON-021-missing-realize-never-waivable.md)

**Related (existing corpus)**

- Refines [SW-027](../specs/SW-027-apply-waivers.md): its match-and-stale step now matches by id or pattern and waives a missing test. (Supersession candidate — reconcile at promotion; my lean is to refine SW-027 in place.)
- Its specs realize [SYS-012](../specs/SYS-012-coverage-policy-and-waivers.md): a gap is admitted only as a missing test, by a possibly-pattern waiver.
- Sharpens the waiver list introduced by [STR-018](STR-018-coverage-report.md).
- Motivated by the structural gaps the report surfaced: `STK-*` Realized-forever and SYS-001 (no honest verify), versus STK-005 / SYS-007 / SYS-009 (`None`), which must stay visible.

**Artifacts** (not specs)

- [ENT-002](../domain-model.md#ent-002-configuration): the `waivers` attribute gains `pattern` (an alternative to `id`); an entry stays `{ id | pattern, reason }`.
- A changeset for the refined waiver behaviour.
