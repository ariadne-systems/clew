**Title**
Promotion substitutes a draft's temporary id exhaustively

**Lens**: CON

**Status**: active

**Description**
When a draft is promoted, every occurrence of its temporary id **within the drafts location** is replaced by the bound id: the promoted draft's body and filename, and any other draft that still references it.
The already-promoted spec tree and the domain model are not rewritten — a promoted spec is kept free of temporary ids by refusing to promote an unresolved reference (CON-027), not by substituting one away after it has been admitted.
After a successful promote, no occurrence of that temporary id remains in the drafts being promoted; an intra-batch reference resolves to the bound id, and a still-unpromoted draft that referenced the promoted one points at the bound id.
A temporary id carries exactly one reserved `-TMP-` marker (CON-008), so every occurrence within the drafts is found and replaced unambiguously.

**Rationale**
A temporary id is a placeholder; leaving one behind in a reference produces a dangling pointer to an id that was never bound, silently breaking the traceability between specs.
Substitution is scoped to the drafts because that is where a temporary id is a *reference*: drafts cross-reference each other by id while in flight.
A promoted spec, by contrast, may *mention* a temporary id as documentation — the readable id form (STR-021) is textually identical to prose about ids — so rewriting the promoted tree by token match would corrupt an unrelated spec; the promoted tree is kept clean instead by refusing an unresolved reference (CON-027).
This keeps the leave-nothing-dangling discipline for references while never editing a spec the promotion did not introduce.

**Verification Description**
After promoting a draft, a search for its temporary id across the drafts being promoted and the drafts location returns nothing; an intra-batch reference, and a reference from a still-unpromoted draft, both point at the bound id.
The already-promoted spec tree is left byte-for-byte unchanged by the substitution.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Related**

- Revised by [CON-027](CON-027-no-temporary-id-in-promoted-corpus.md) — scopes this substitution to the drafts and moves the promoted-tree guarantee to a refusal check.

## Changes

- **2026-06-27** — Recorded the failure-case complement (CON-024): this constrains a successful promotion — no occurrence of the temporary id is left behind — while CON-024 constrains a failed one, where no change is left behind.
- **2026-06-28** — Scoped substitution to the drafts location and dropped the "globally unique, so every occurrence is replaced" premise: a readable temporary id (STR-021) coincides with the example prose that documents the id scheme, so rewriting already-promoted specs by token match corrupted unrelated specs.
The promoted tree is now kept free of temporary ids by refusing an unresolved reference (CON-027, realized through STR-025), not by substituting across it.
