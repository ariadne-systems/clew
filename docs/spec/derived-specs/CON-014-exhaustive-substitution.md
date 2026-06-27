**Title**
Promotion substitutes a draft's temporary id exhaustively

**Lens**: CON

**Status**: active

**Description**
When a draft is promoted, every occurrence of its temporary id is replaced by the bound id, everywhere the id can appear: the promoted draft's body and filename, already-promoted specs and the domain model, and any other draft that referenced it.
After a successful promote, no occurrence of that temporary id remains anywhere in the spec locations or the drafts location.
A temporary id is globally unique and carries exactly one reserved `-TMP-` marker (CON-008), so every occurrence is found and replaced unambiguously.

**Rationale**
A temporary id is a placeholder; leaving even one occurrence behind produces a dangling reference to an id that was never bound, silently breaking the traceability between specs.
Because a temporary id is globally unique, substitution can be exhaustive without ambiguity — there is no occurrence that should be kept, and a partial replacement is always a defect.
This is the same leave-nothing-dangling discipline the tool applies to its ids elsewhere.

**Verification Description**
After promoting a draft, a search for its temporary id across the spec locations and the drafts location returns nothing.
A reference to the promoted draft from an already-promoted spec, and from an unpromoted draft, both point at the bound id after the run.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

## Changes

- **2026-06-27** — Recorded the failure-case complement (CON-024): this constrains a successful promotion — no occurrence of the temporary id is left behind — while CON-024 constrains a failed one, where no change is left behind.
