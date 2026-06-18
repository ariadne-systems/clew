---
"@ariadne-thread/core": minor
"@ariadne-thread/cli": minor
---

Add the `ariadne promote` command (STR-013).

`ariadne promote` finalizes reviewed drafts into the spec tree: for each draft it binds a real id by minting the draft's lens, substitutes that temporary id project-wide — across the spec tree and the drafts location, including already-promoted specs and any unpromoted draft that referenced it — and moves the draft into its configured location renamed to the bound id.
With no arguments it finalizes all pending drafts; `ariadne promote <id|path>…` finalizes only the named ones.
It is the mechanical half of promotion — integration reasoning stays with the user — and it leaves committing to the user.
An entity draft is a content merge rather than a file move, so it is not finalized; promotion fails fast with `E_ENTITY_DRAFT_UNSUPPORTED`, and a named draft that is not found fails with `E_DRAFT_NOT_FOUND`, rather than acting incorrectly.
