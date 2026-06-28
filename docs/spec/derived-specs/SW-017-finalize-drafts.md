**Title**
Finalize reviewed drafts into the spec tree

**Lens**: SW

**Status**: active

**Description**
Finalizing takes the drafts named to promote — one or more stories or specs, or `all` — and resolves the set it finalizes as the transitive closure of the temporary references reachable from those roots (CON-028); a story thereby carries its specs through its references.
Before binding any id, it refuses the promotion when that closure reaches a temporary reference to a draft outside the set — an unresolved `-TMP-` reference (CON-008) — so an unresolved reference is never carried into the tree (CON-027); nothing is bound or moved.
Otherwise, for each draft in the set it:
- binds its id by minting the draft's lens, which is the prefix of the draft's temporary id, in bound (non-temporary) mode, advancing the state (SW-002, CON-002);
- substitutes the resolved temporary id within the drafts location — the promoted drafts and any still-unpromoted draft that references them — leaving the already-promoted spec tree and the domain model untouched (CON-014);
- moves the draft file into its configured location — a story to `layout.stories.dir`, a derived spec to `layout.derivedSpecs.dir` (ENT-002) — renamed to the bound id.
It returns each temporary-id → bound-id mapping.
Finalizing is the mechanical half of promotion; deciding what a draft means for the corpus — relations, supersession, conflicts — is not part of it, and it does not commit.

**Rationale**
The mechanical steps of promotion are deterministic and identical every time, yet doing them by hand is slow and error-prone — above all the substitution and the precondition that no unresolved temporary reference is promoted, where one mistake leaves a dangling reference.
Producing the binding, substitution, refusal, and move in the core makes the step repeatable and testable, and lets the promotion workflow keep only the judgment an agent must supply.

**Verification Description**
Given a draft with a temporary id, finalizing mints a bound id for the draft's lens, advancing the state, and renames and moves the draft file to its configured location.
Every occurrence of the temporary id within the drafts — in the promoted draft and in any still-unpromoted draft that references it — is replaced with the bound id, while the already-promoted spec tree is left unchanged.
A promotion whose closure reaches a temporary reference to a draft outside the set is refused rather than moved, with nothing bound.
The reported mapping pairs each temporary id with its bound id.
Binding follows the same persistence guarantee as minting: an id is reported only after the advance is durably persisted (CON-004).

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)

**Related**

- Constrained by [CON-028 — A promotion is rooted at named drafts and finalizes their reference closure](CON-028-promotion-rooted-at-named-drafts.md) — finalize resolves the closure of the named roots and refuses an unresolved reference.
- Resolved by [SW-035 — Promotion resolves its set as the closure of the named roots' references](SW-035-resolve-set-as-reference-closure.md) — SW-035 computes the set this finalizes, and refuses an unresolved reference.

## Changes

- **2026-06-27** — Finalization is now atomic (CON-024): its substitution and move run as prepare-then-commit through atomic renames, so a failed promotion leaves the spec tree unchanged. The mechanical steps — bind, substitute, move — are otherwise unchanged.
- **2026-06-28** — Substitution scoped to the drafts location, and finalization now refuses a draft that would carry an unresolved temporary reference into the tree (SW-035, CON-027).
It previously substituted project-wide, which rewrote already-promoted specs and could corrupt prose that mentions an id; the promoted tree is no longer rewritten.
- **2026-06-28** — The set finalized is now the reference closure of the named roots (a story or spec, or `all`), not a flat pending list (CON-028); the no-argument "all pending" selection is gone.
