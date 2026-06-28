**Title**
The tool runs its deterministic integrity checks as one `clew check` command

**Business Value**
clew's whole pitch is that the link between specs and code cannot rot silently.
Yet the integrity of the corpus *itself* — a relation link that points at nothing, a temporary id left behind after promotion, an invalid status, a spec id smuggled into a code comment, two files claiming one id — is checked by nothing until a build breaks, and some of it never breaks the build at all.
The one corpus check that exists today (`scripts/check-references.mjs`) is a repo-local script wired into this project's hooks; a project that adopts clew inherits none of it.
A single `clew check` command — runnable in pre-commit, CI, or by any agent — makes the integrity the markers promise actually enforced, and ships it so every consumer project gets it for free.

**Problem / Context**
The deterministic checks the system needs are scattering into one-offs: a repo-local reference-rot script here, a fail-fast inside `scan` there, a coverage gate on the backlog, a comment-lint proposed as its own command.
Left unconsolidated that becomes four overlapping surfaces, none portable.
And several of these checks do not exist at all yet — nothing catches a dangling relation link or a leftover temporary id outside this repo's own script.

**Solution Approach**
Add one `clew check` command that runs a **suite** of deterministic checks over the corpus and the anchors, reports every violation with its location, and exits non-zero if any check fails.
The suite is the single home for every mechanical integrity check, so each is added once and inherited everywhere clew runs:
- relation links resolve to real spec files (reference rot, CON-029) — type-agnostically, since the relation vocabulary is project-defined;
- no temporary id survives in the promoted tree (CON-027 as a standing check — the invariant that no temporary id reaches the tree, complementing the promote-time CON-014 guarantee);
- every `**Status**` is a recognized value (CON-022);
- no spec id appears in a code comment or name — comment detection delegated to pluggable per-language finders (ARCH-006), the rule mechanized here rather than as a separate command;
- no two files declare the same id (the same logic `scan` gates on, surfaced as a check);
- a document conforms to its declared schema — required fields and enums — which the scan validates on load (the document-schema validation feature, its own story); surfaced here rather than hand-rolled in the suite.
Each check is a small module reusing existing core plumbing — the scan, draft parsing, the located-anchor record (SYS-002); the command is a thin runner that aggregates the findings and sets the exit code.
Judgment-adjacent checks are deliberately excluded or kept as soft warnings (see Out of scope) — the suite is mechanical, not opinionated.

**Acceptance Criteria**
- `clew check` runs every configured check, prints each violation with its file and location, and exits non-zero if any check fails; a clean corpus exits zero with nothing to report.
- A relation link to a non-existent spec id is reported.
- A temporary id left anywhere in the promoted tree is reported (CON-027).
- An unrecognized `**Status**` value is reported (CON-022).
- A spec id in a code comment or test name is reported.
- Two files declaring the same id are reported.
- The command ships with the tool: a consumer project runs `clew check` with no repo-local script of its own.
- Tests cover each check's clean and violating case, and the aggregate exit code.

**Out of scope**
- The coverage **gate** (exit non-zero on an uncovered spec) — a natural future member of this suite, but its own decision; this story stands up the command and the corpus/anchor checks.
- **Judgment-adjacent checks** — slug↔title tightening (006), and "`## Changes` present on a spec that changed" (needs a git baseline) — excluded, or a soft warning at most.
- **Auto-fixing** any violation — `clew check` reports; fixing is the author's job, or another command's.
- A **spec-graph / transitive** analysis — coverage stays flat code↔spec; this command builds no dependency graph.

## Relations

**Realizes**

- [STK-002 — A trustworthy, exportable trace record](../derived-specs/STK-002-audit-evidence.md)

**Realizes** (new specs)

- [SW-034 — clew exposes a `check` command that runs the integrity-check suite](../derived-specs/SW-034-check-command.md)
- [ARCH-005 — Deterministic integrity checks are one shipped `clew check` suite](../derived-specs/ARCH-005-checks-are-one-suite.md)
- [SYS-014 — The system detects a spec reference that bypasses the anchor](../derived-specs/SYS-014-detect-references-bypassing-anchor.md)
- [SW-033 — clew reports a spec id found in a code comment](../derived-specs/SW-033-flag-spec-id-in-comment.md)
- [CON-026 — A spec id appears in code only inside its anchor](../derived-specs/CON-026-spec-id-only-in-anchor.md)
- [CON-029 — Every relation link resolves to an existing spec](../derived-specs/CON-029-relation-link-resolves.md)
- [ARCH-006 — Comment detection is delegated to pluggable per-language comment finders](../derived-specs/ARCH-006-pluggable-comment-finders.md)

**Related**

- Folds in the spec-id-in-comment check — detection (SYS-014), the report (SW-033), and the invariant it holds (CON-026) — as one member of this suite rather than a standalone command; the earlier standalone-command framing is dropped.
- Surfaces [CON-025 — A bound spec id is declared by exactly one file](../derived-specs/CON-025-one-file-per-spec-id.md) — the same logic `scan` gates on at generation, exposed as a standing check.
- Enforces existing invariants as checks: [CON-027 — no temporary id in the promoted tree](../derived-specs/CON-027-no-temporary-id-in-promoted-corpus.md) and [CON-022 — a spec's status is one of the declared values](../derived-specs/CON-022-valid-status.md).
- Generalizes the repo-local reference-rot script (`scripts/check-references.mjs`) into a shipped capability.
