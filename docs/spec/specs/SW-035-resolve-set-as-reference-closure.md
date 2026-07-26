**Title**
Promotion resolves its set as the closure of the named roots' references

**Lens**: SW

**Status**: active

**Description**
Promotion resolves the set it finalizes from the drafts named as roots — one or more stories or specs, or the keyword `all` — and the specs a **story** root directly references: only a story root brings other drafts into the set; a spec is a leaf, its references validated against the set rather than followed onward (CON-028).
A draft in the set that references one the set does not include — a `-TMP-` marker (CON-008) pointing outside it — makes the promotion refuse before any id is bound, naming the reference, so no id is spent (CON-002) and nothing is moved.
Substitution of the resolved ids then runs only within the drafts of the set (CON-014); the already-promoted tree is never rewritten.

**Rationale**
Computing the set from the named roots' references makes "promote this story" mean exactly "promote this story and what it depends on," and makes the set *derivable* rather than a flat pending list whose membership is guessed.
Resolving the whole closure and refusing an unresolved reference up front is what keeps a temporary id from ever reaching the promoted tree (CON-027); doing it before binding means a refused promotion costs nothing.

**Verification Description**
Promoting a named story finalizes that story and exactly the drafts it directly references, and no other pending draft.
A draft in the set that references one the set does not include — including a spec the story did not itself reference — is refused, naming it, with no id bound and nothing moved.
Promoting a named spec whose references are all already bound finalizes just that spec.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)

**Related**

- Realizes [CON-028](CON-028-promotion-rooted-at-named-drafts.md) — this is the behaviour that resolves the set and refuses an unresolved reference.
- Holds [CON-027](CON-027-no-temporary-id-in-promoted-corpus.md) — refusing an unresolvable closure is how no temporary id reaches the tree.
- Substitutes within the set per [CON-014](CON-014-exhaustive-substitution.md).
- Part of [SW-017](SW-017-finalize-drafts.md) — SW-017 finalizes the set this resolves.

## Changes

- **2026-06-28** — Reframed from a substitution-scope spec (its earlier slug was `substitute-within-drafts-refuse-unresolved`) to the set-resolution behaviour: promotion resolves its set as the named roots' reference closure (CON-028) rather than taking a flat batch and checking for a leftover `-TMP-` marker.
The drafts-only substitution (CON-014) and the refusal are unchanged in effect; what changed is that the set is now derived from named roots, not handed in as a pending batch.
- **2026-06-28** — Set active: implementation of STR-025 began.
- **2026-06-28** — The set is the named roots and the specs a story root directly references, not the transitive closure: only a story root expands the set, a spec root is a leaf, and a reference is validated against the set rather than followed onward (CON-028). A spec the story did not itself reference, or a draft referenced by a named spec, is no longer pulled in — it is refused.
