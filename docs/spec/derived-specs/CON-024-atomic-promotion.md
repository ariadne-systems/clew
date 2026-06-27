**Title**
A failed promotion leaves the spec tree unchanged

**Lens**: CON

**Description**
When a promotion fails while preparing its changes — computing the rewrites and staging them to temporary files, before anything is committed — the spec tree and the drafts location are left exactly as before the run.
Promotion stages every change first and commits only by atomic rename, so each file is always wholly old or wholly new: no file is ever partially written.
The only residue an aborted run may leave is a minted id it consumed, which is not reclaimed — a gap is allowed (CON-002); reuse is not.

**Rationale**
Promotion mints permanent ids and rewrites many version-controlled files; without atomicity, a mid-run failure leaves a half-promoted corpus — substituted content with unmoved drafts — that is laborious to repair and silently breaks the traceability between specs.
The guarantee is reached by computing and staging all changes before any real file is touched, then committing only through atomic renames, so the failure window is a fast batch of rename operations and an aborted run is a non-event the user re-runs.
Reclaiming the minted number is deliberately not attempted: a gap is harmless, and un-advancing a durable counter is its own hazard.

**Verification Description**
A promotion whose preparation fails — for instance a draft whose bound-id target is already occupied — leaves every file in the spec tree and the drafts location byte-identical to before the run, with nothing staged into place.
A successful promotion still binds each id, substitutes every occurrence, and moves each draft.
Each file is written stage-then-rename, so an interrupted write never leaves a partially written file.

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](SYS-005-spec-lifecycle.md)

**Related**

- Constrains [SW-017 — Finalize reviewed drafts into the spec tree](SW-017-finalize-drafts.md) — how its substitution and move execute.
- Complements [CON-014 — Promotion substitutes a draft's temporary id exhaustively](CON-014-exhaustive-substitution.md) — success-completeness there, failure-atomicity here.
