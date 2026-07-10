**Title**
Promotion refuses a draft with an unresolved temporary reference, and never rewrites the promoted tree

**Business Value**
clew's promise is that it never silently corrupts the corpus it governs.
Promotion breaks that promise two ways today, and both come from the same root: it substitutes a draft's temporary id by raw text match across the *whole* spec tree.
First, it can rewrite an unrelated, already-promoted spec that merely *mentions* the id as an example — this actually corrupted three specs in one run.
Second, it silently moves a draft into the tree carrying a temporary reference to another draft that was not promoted, leaving a dangling id behind.
Scoping substitution to the drafts and refusing an unresolved reference makes promotion safe to run on any corpus and guarantees the promoted corpus never holds an id that was never bound.

**Problem / Context**
`promote` replaces a temporary id with the bound id everywhere the token appears, including the already-promoted spec tree and the domain model.
The only reason to rewrite the *promoted* tree is to fix an already-promoted spec that contains a temporary id — but a promoted spec should never contain one.
The only way it could is that we previously promoted a spec referencing an unbound draft; forbid that and promoted-tree substitution is unnecessary.
The documented workflow already agrees: integration edits to existing specs are applied by hand, after promote, with the bound id it reported — never by writing a temporary id into a promoted spec for promote to resolve.
Two concrete failures follow from the current scope:
- promoting a draft whose readable id was `SW-TMP-001` rewrote `SW-TMP-001` / `SW-TMP-002` inside CON-023, SW-032, and STR-021, where those tokens are the *examples* that document the id scheme (the collision exists because STR-021 made ids legible — they are now textually identical to prose about ids);
- promoting a draft that forward-references an unpromoted draft moves it into the tree still carrying that draft's temporary id, dangling.

**Solution Approach**
Root promotion at named drafts, resolve the set from their references, substitute safely, and refuse anything unresolved:
- **Root at named drafts.** `promote` requires one or more named drafts — a story (which carries its specs through its references) or a spec — or the keyword `all`; the no-argument "finalize all pending" form is removed (SW-016, CON-028).
- **Resolve the set from the roots.** The set finalized is the named roots and the specs a story root directly references (SW-035) — only a story root brings other drafts in; a spec is a leaf, its references validated against the set, not followed onward. So "promote this story" means "promote this story and the specs it lists"; a story must reference each of its specs, and a spec named directly must reference only bound ids.
- **Substitute only within the drafts** of the set — the promoted drafts' own bodies and any other still-unpromoted draft that references them — leaving the already-promoted spec tree and the domain model untouched (CON-014).
- **Refuse before binding** if the closure reaches a temporary reference to a draft outside the set — an unresolved `-TMP-` marker (CON-008); nothing is bound or moved, so no id is spent (CON-002).

Promotion therefore finalizes only a referentially-closed set rooted at a named draft, and the promoted corpus never contains a temporary id — enforced by refusal, not by editing already-promoted specs (CON-027).

**Acceptance Criteria**
- `promote` requires at least one named draft (a story or a spec) or the keyword `all`; invoked with no argument it errors, and never finalizes whatever happens to be pending (SW-016, CON-028).
- Promoting a story finalizes that story and exactly the drafts it directly references, and no other pending draft.
- A draft in the set that references one the set does not include — including a spec the story did not itself reference — refuses, with an error naming the draft and the reference; no id is bound and no file is moved (the refusal precedes binding, so no id is spent).
- A promotion leaves every already-promoted spec and the domain model byte-for-byte unchanged; promote writes outside the drafts location only to place the promoted drafts at their bound-id targets.
- A still-unpromoted draft that references a draft in the set has its reference rewritten to the bound id.
- The existing guarantees hold: a successful promotion binds each id and moves each draft (SW-017), and a failed one leaves the tree unchanged (CON-024).
- A new stable error code identifies the unresolved-reference refusal.
- Tests cover: a story's closure resolved and finalized, the no-argument error, the unresolved-reference refusal (nothing bound or moved), an example token in an unrelated promoted spec left untouched, and a reverse reference from another draft rewritten.

**Out of scope**
- **Reverting to opaque temporary ids** — STR-021's legible form stands; this makes promotion safe *given* legible ids.
- The **`clew check` suite** (STR-024) — separate, and it would not have caught this: the corruption *removed* temporary ids, leaving none for the CON-014 "no temp id survives" check to find. The guard belongs in `promote`.
- **Integration edits to existing specs** — they stay manual, applied after promote with the bound id (unchanged from the current workflow); this story removes promote's need to touch promoted specs at all.
- **Promoting a partial closure** — naming a story promotes its whole reference closure; there is no option to promote a story while leaving out a draft it references. Promote the story when its set is ready, or not yet.

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](../specs/SYS-005-spec-lifecycle.md)

**Realizes** (new specs)

- [CON-028 — A promotion is rooted at named drafts and finalizes their reference closure](../specs/CON-028-promotion-rooted-at-named-drafts.md)
- [SW-035 — Promotion resolves its set as the closure of the named roots' references](../specs/SW-035-resolve-set-as-reference-closure.md)
- [CON-027 — A promoted spec never contains a temporary id](../specs/CON-027-no-temporary-id-in-promoted-corpus.md)

**Related**

- Revises [SW-016 — The tool exposes a `promote` command that delegates to core](../specs/SW-016-promote-command.md) — the command now names a draft (or `all`) and no longer finalizes all pending with no argument.
- Hardens [SW-017 — Finalize reviewed drafts into the spec tree](../specs/SW-017-finalize-drafts.md) — it finalizes the resolved closure, substitutes only within the drafts, and refuses an unresolved reference.
- Revises [CON-014 — Promotion substitutes a draft's temporary id exhaustively](../specs/CON-014-exhaustive-substitution.md) — removes "already-promoted specs and the domain model" from substitution scope; the no-dangling guarantee is met by refusing an unresolved reference within a closed set.
- Supersedes the draft-selection of [STR-013 — Add an `clew promote` command](STR-013-promote-command.md) — its "promote-all by default / named drafts" selection and project-wide substitution are replaced by rooting at a named story (or `all`) and resolving the closure.
- Traces the collision to [STR-021 — Readable per-author temporary ids](STR-021-readable-per-author-temporary-ids.md) — legible ids are what made a temporary id coincide with example prose.
- Complements [CON-024 — A failed promotion leaves the spec tree unchanged](../specs/CON-024-atomic-promotion.md) — atomicity guards a *failed* run; this keeps a *successful* one from writing outside the drafts.

## Changes

- **2026-06-28** — Broadened from "scope substitution + refuse a leftover marker" to the full promote model: promotion is **rooted at named drafts** (a story or spec, or `all`) and finalizes the **reference closure** of those roots (CON-028, SW-035), with the no-argument "all pending" form removed (SW-016).
The substitution-scoping and refusal are unchanged in effect; what changed is how the set is selected.
This supersedes STR-013's draft-selection decision.
- **2026-06-28** — Settled the set as the named roots and the specs a *story* root *directly* references, not the transitive closure: only a story root expands the set, a spec is a leaf, and a reference is validated rather than followed. So neither a spec the story omitted nor a draft referenced by a named spec is pulled in — both are refused — and a promotion cannot reach silently across story boundaries or down a spec's references.
