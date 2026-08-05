**Title**
Spec cross-references carry only the target's id, so no title label can go stale

**Status**: done

**Business Value**
clew's promise is that the link between specs and code cannot rot silently.
Today a relation is cited as `[SYS-002 — <title>]` over a path `SYS-002-slug.md` — id, title, and path — and `clew check` already guards the path (CON-029).
But the *title* is a copy of the target's title pasted into the citing document; when the target is retitled, that copy is left behind, resolving yet wrong — the corpus drifting exactly where the build does not look (a demo run read a stale SYS-002 label as a second, separate spec).
The fix is not to police the copy but to stop making it: cite a spec by its id alone.
The id is already clew's single source of truth — the traceable name and slug derive from it — so an id-only citation is the reference in its most stable form, with nothing to fall out of sync, for every project that runs `clew check`.

**Problem / Context**
A citation `[<id> — <title>]` denormalizes the target's title into every document that references it.
A retitle renames the file (the slug is the title tightened), so the *path* dangles and CON-029 forces a fix — but the pasted *title* in the link text satisfies nothing and rots silently.
Matching the copy back to the source is not cleanly mechanical: the corpus already cites the same spec three ways — full title (`SYS-003 — The system allocates…`), slug read as words (`CON-022 — valid status`), and free paraphrase (`CON-027 — no temporary id in the promoted tree`) — so no exact rule catches rot without flagging valid links, which is why STR-024 deferred title-checking as judgment-adjacent.
Removing the copy removes the problem: the id is stable, and the tool-owned slug in the path is the always-current readable hint a reader needs.

**Solution Approach**
Standardize every spec cross-reference to its id: a relation link's text is the target's id, and the path keeps the tool-owned `<id>-<slug>.md` filename.
Add one member to the `clew check` suite that reports a relation link whose text starts with a spec id but carries anything beyond that id — mechanically, with no title comparison, no fuzzy matching, and no judgment about phrasing.
Convert the existing corpus to the id-only form as part of this story, so the check passes over a clean corpus.
Drafts and scaffolded example templates are excepted, as they are for CON-029.
And because a spec about citation form must be able to quote that form, both the new check and reference-rot ignore any citation or link that sits inside an inline-code or fenced-code span — a quoted form is an illustration, not a reference.

**Acceptance Criteria**
- A relation link whose text is exactly the target's id (for example `[SYS-003]` over the path `SYS-003-stable-spec-identity.md`) is accepted.
- A relation link whose text is an id followed by any further label (for example `[SYS-003 — The system allocates…]`) is reported with its file and location.
- A link whose text is not an id-citation at all (deliberate descriptive prose) is unaffected.
- The existing corpus is rewritten to the id-only form, and `clew check` exits zero over it.
- A citation inside the drafts location, a scaffolded example template (`*.example.md`), or an excluded path is not reported.
- A citation or link quoted inside an inline-code or fenced-code span is treated as an example, not a reference — neither the id-only check nor reference-rot flags it — so a spec can show the form it governs.
- The check ships in the suite, and tests cover the id-only, id-plus-label, non-id-link, code-span-quoted, and excepted-location cases.

**Out of scope**
- Auto-fixing a violation — `clew check` reports it; rewriting a stray label is the author's job, as for every other suite member.
- Descriptive, non-id link text — a link intentionally worded as prose is not an id-citation and is not constrained.
- Slug↔title tightening (a spec's slug against its own title, 006) — still deferred; this story removes the pasted-title rot, not the phrasing judgment.
- Rendering ids as titles for reading — expanding `[SYS-003]` to a human title at read time is a viewer concern, not a corpus-format one.

## Relations

**Realizes** (new specs)

- [CON-034](../specs/CON-034-cross-reference-is-id-only.md)

**Related**

- Extends the suite stood up by [STR-024](STR-024-clew-check-suite.md) — a new member beside reference-rot.
- Complements and refines [CON-029](../specs/CON-029-document-link-resolves.md): CON-029 checks the reference *lands*; this keeps the reference *to the id alone*, so together a citation is a bare id that resolves. This story also refines CON-029 so a citation quoted inside a code span is not treated as a reference.

## Changes

- **2026-07-26** — Rewrote the two illustrative citation examples so they no longer form a markdown `[text]`-then-`(path)` link pair.
Embedded in prose they read as real relative links to files that do not exist, so reference-rot (CON-029) flagged them once the story left the drafts exception; a spec about link form must describe the form, not embed a live link to it.
The examples' meaning is unchanged.
- **2026-07-26** — Folded in a refinement this promotion surfaced: both the new id-only check and reference-rot must ignore citation and link syntax quoted inside a code span, so a spec can show the form it governs without self-flagging (the case above).
Added the acceptance criterion and scoped the CON-029 refinement into this story rather than spinning up a separate one; the id-only decision itself is unchanged.
