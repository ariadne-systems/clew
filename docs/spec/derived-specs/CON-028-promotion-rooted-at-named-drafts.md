**Title**
A promotion is rooted at named drafts and finalizes their reference closure

**Lens**: CON

**Status**: active

**Description**
A promotion is rooted at one or more drafts named explicitly — or the keyword `all` — and finalizes those roots together with the specs a **story** root directly references.
A flat, unnamed promotion of whatever drafts happen to be pending is never allowed.
Only a **story** root brings other drafts into the set; a **spec** is a leaf — its references are validated against the set, never followed onward.
The intended root is a story, which references its draft specs: naming the story promotes the whole unit it introduces, so the story is the **manifest** of its set and must itself reference each of its specs.
A spec may be named directly when it is a follow-on to an already-promoted story — a leaf that reaches nothing further, so its references must already be bound.
A draft in the set that references one the set does not include is rejected — not pulled in — so a promotion never reaches silently past its named roots, and is never partial.

**Rationale**
Requiring an explicit root makes the set a promotion finalizes *derivable* rather than guessed; finalizing a flat pending list silently couples unrelated work and gives "promote" no relation to the unit a person actually reasons about — that ambiguity was a real source of confusion.
Rooting at a story is the common case because a story manifests its specs, so its set is the coherent unit of authoring; allowing a spec as a root covers the follow-on whose story is already promoted, which a story-only rule could not express — and a spec whose references are all resolved carries no dangling temporary id, so nothing in the result is weakened by admitting it.
Not following a reference onward — refusing one the set does not include rather than pulling it in — keeps a promotion from silently reaching across story boundaries, and is what lets CON-027 hold: the promoted tree never receives a temporary id because a promotion never finalizes an incomplete set.

**Verification Description**
Promoting a named story finalizes that story and the drafts it directly references, and no other pending draft.
Promoting a named spec whose references are all resolved — already bound, or within the named set — finalizes just that spec.
A promotion in which a draft references one the set does not include — including a spec the named story did not itself reference — is rejected, naming the reference.
An unnamed promotion — no draft named and not `all` — is rejected, as is `all` given together with any named draft, since `all` already promotes every pending draft.

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
- **2026-06-28** — Replaced "transitive closure" with the manifest rule: only a **story** root brings other drafts into the set (its specs); a spec is a leaf, its references validated against the set, never followed onward.
The transitive reading let a promotion reach silently past its roots — across story boundaries, and by following a spec's references — and contradicted the manifest clause (an unlisted spec was still reached). A story must now reference each of its specs, and a spec named directly must reference only bound ids, or the promotion is refused.
- **2026-06-28** — `all` must be given alone: combined with a named draft it is now rejected, rather than silently discarding the named draft.
