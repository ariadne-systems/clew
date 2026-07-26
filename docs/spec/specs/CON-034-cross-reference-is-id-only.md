**Title**
A spec cross-reference cites its target by id alone, with no title label

**Lens**: CON

**Description**
A relation link to a spec cites the target by its id: the link text is the target's `<id>`, and the path is the tool-owned `<id>-<slug>.md` filename.
The link text carries no title or descriptive label beyond the id.
The check reports a relation link whose text starts with a spec id but continues past it — a pasted title or paraphrase — with its location; a link whose text is not an id-citation (deliberate descriptive prose) is not constrained.
The **drafts** location and the scaffolded **example templates** (`*.example.md`) are excepted, as they are for CON-029.
A citation quoted inside an inline-code or fenced-code span is an example, not a reference, and is not flagged — so a spec may show the very form it forbids; this is the same link-identification reference-rot uses.
The id is clew's single source of truth — the traceable name and slug derive from it — so an id-only citation is the reference in its most stable form: the target's title lives in exactly one place, and no copy can fall out of sync.

**Rationale**
A citation that pastes the target's title into the link text denormalizes a value the target already owns; when the target is retitled the copy is left behind, resolving yet stale, and nothing catches it — CON-029 guards only that the path lands on a real node.
Policing the copy is not cleanly mechanical: the corpus cites the same spec by full title, by slug read as words, and by free paraphrase, so no exact rule separates rot from a valid paraphrase — which is why title-checking was deferred as judgment-adjacent (STR-024).
Citing by id alone removes the copy, so the rot cannot occur and the check stays a mechanical "is the link text the id, and nothing more"; the reader still gets an always-current hint from the tool-owned slug in the path.

**Verification Description**
A relation link whose text is exactly the target's id is accepted; a link whose text is an id followed by any further label is reported with its location.
A link whose text is not an id-citation is not reported.
A link inside the drafts location, a scaffolded example template (`*.example.md`), or an excluded path is not reported.
A citation quoted inside an inline-code or fenced-code span is not reported.

## Relations

**Realizes**

- [SYS-003 — The system allocates unique, stable, persistent spec ids](SYS-003-stable-spec-identity.md)

**Related**

- The companion of [CON-029 — Every document link resolves to an existing target](CON-029-document-link-resolves.md): CON-029 checks the reference lands on a real node; this keeps the reference to the id alone, so a citation is a bare id that resolves.
- Runs as a member of the suite in [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](../stories/STR-024-clew-check-suite.md).

## Changes

- **2026-07-26** — Added that a citation quoted inside a code span is an example, not a reference, so a spec can show the forbidden form without self-flagging.
Folded in from STR-035 on the day of promotion; the id-only rule itself is unchanged, and reference-rot shares the same link-identification.
