**Title**
A promoted spec never contains a temporary id

**Lens**: CON

**Status**: active

**Description**
After a successful promotion, no spec in the promoted tree — the stories and derived-specs locations and the domain model — contains a temporary id.
Promotion holds this by **refusing to finalize** when a draft to be promoted references a temporary id the promotion does not bind: a `-TMP-` marker (CON-008) whose id is not among the drafts being promoted.
It does **not** rewrite an already-promoted spec to clear such a reference; the promoted corpus stays free of temporary ids because promotion never admits one, not because it cleans one up.

**Rationale**
A temporary id in the promoted corpus is a reference to an id that was never bound — a silent dangling reference.
The only way one arises is promoting a spec that references an unbound draft, so refusing that at promotion keeps the corpus clean without promote ever editing already-promoted specs — and it was exactly that promoted-tree rewriting that let one promotion corrupt the unrelated example prose documenting the id scheme.
The check is exact because CON-008 reserves `-TMP-` for temporary ids and forbids it in any bound id, so any residual marker in a draft to be promoted is unambiguously an unresolved reference.

**Verification Description**
Promoting a draft that references a temporary id not in the promotion batch is refused with an error naming the draft and the unresolved id; nothing is bound or moved.
After any successful promotion, a search for the `-TMP-` marker across the promoted tree returns nothing.

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](SYS-005-spec-lifecycle.md)

**Related**

- Revises [CON-014 — Promotion substitutes a draft's temporary id exhaustively](CON-014-exhaustive-substitution.md) — the no-dangling guarantee is met by refusing an unresolved reference within a closed set, not by substituting across already-promoted specs.
- Builds on [CON-008 — The `-TMP-` marker is reserved and a prefix may not use it](CON-008-tmp-marker-reserved.md) — the reserved marker makes an unresolved reference unambiguously detectable.
- Is the result of [CON-028 — A promotion is rooted at named drafts and finalizes their reference closure](CON-028-promotion-rooted-at-named-drafts.md) — refusing an incomplete closure is how this invariant is reached.
- Constrains [SW-035 — Promotion resolves its set as the closure of the named roots' references](SW-035-resolve-set-as-reference-closure.md).
- Complements [CON-024 — A failed promotion leaves the spec tree unchanged](CON-024-atomic-promotion.md).

## Changes

- **2026-06-28** — Linked to CON-028 (the rooting/closure rule whose refusal produces this invariant) and retargeted the SW-035 link after that spec was reframed to set-resolution. No change to the invariant itself.
- **2026-06-28** — Set active: implementation of STR-025 began.
