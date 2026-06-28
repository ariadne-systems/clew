**Title**
A promotion is rooted at named drafts and finalizes their reference closure

**Lens**: CON

**Status**: active

**Description**
A promotion is rooted at one or more drafts named explicitly — or the keyword `all` — and finalizes exactly the transitive closure of the temporary references reachable from them.
A flat, unnamed promotion of whatever drafts happen to be pending is never allowed.
The intended root is a **story**: it references its draft specs, so naming the story promotes the whole unit it introduces.
A **spec** may be named directly when it is a follow-on to an already-promoted story, so a single derived spec can be added without a draft story to carry it.
A temporary reference within the closure that cannot be resolved to a draft in the promotion is rejected, so a promotion is never partial.

**Rationale**
Requiring an explicit root makes the set a promotion finalizes *derivable* rather than guessed; finalizing a flat pending list silently couples unrelated work and gives "promote" no relation to the unit a person actually reasons about — that ambiguity was a real source of confusion.
Rooting at a story is the common case because a story manifests its specs, so its closure is the coherent unit of authoring; allowing a spec as a root covers the follow-on whose story is already promoted, which a story-only rule could not express — and a spec whose references are all resolved carries no dangling temporary id, so nothing in the result is weakened by admitting it.
Resolving the whole closure up front and refusing an unresolved reference is what lets CON-027 hold: the promoted tree never receives a temporary id because a promotion never finalizes an incomplete set.

**Verification Description**
Promoting a named story finalizes that story and every draft reachable from it by temporary reference, and no other pending draft.
Promoting a named spec whose references are all resolved — already bound, or within the named set — finalizes just that spec.
A closure that reaches a temporary reference to a draft not in the promotion is rejected, naming the unresolved reference.
An unnamed promotion — no draft named and not `all` — is rejected.

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](SYS-005-spec-lifecycle.md)

**Related**

- Constrains [SW-016 — The tool exposes a `promote` command that delegates to core](SW-016-promote-command.md) — the command names one or more drafts (a story or a spec), or `all`, never nothing.
- Constrains [SW-017 — Finalize reviewed drafts into the spec tree](SW-017-finalize-drafts.md) — finalize operates on the resolved closure.
- Makes [CON-027 — A promoted spec never contains a temporary id](CON-027-no-temporary-id-in-promoted-corpus.md) hold — refusing an incomplete closure is how no temporary id reaches the tree.
- Scopes [CON-014 — Promotion substitutes a draft's temporary id exhaustively](CON-014-exhaustive-substitution.md) — substitution runs across the drafts in the resolved set.

## Changes

- **2026-06-28** — Set active: implementation of STR-025 began.
