**Title**
`clew check`'s reference-rot covers every document, retiring the repo-local reference lint

**Business Value**
The project runs two reference checkers: `clew check`'s reference-rot member, which walks only the spec tree, and a repo-local `scripts/check-references.mjs`, which walks the whole document corpus — `CLAUDE.md`, the ADRs, the governance baselines, the skills — and also resolves `@import` includes.
ARCH-005 already says every deterministic check is a member of the one `clew check` suite, never a repo-local script; the script survives only because the suite's reference-rot is too narrow to replace it.
Widening reference-rot to the whole non-excluded document corpus lets `clew check` subsume the script, so the project — and any project adopting clew — gets full reference integrity by running one command, with nothing to copy into its own repo.
That portability is the point of ARCH-005.

**Problem / Context**
- `clew check`'s reference-rot (CON-029) walks only the configured spec tree (the stories and specs directories), and its wording scopes to links under `## Relations`.
So a dangling link in an ADR, in `CLAUDE.md`, in a governance baseline, in a skill, or in the domain model is invisible to it.
- `check-references.mjs` covers those (161 files today) and additionally resolves `@import` / `@`-includes, which the suite member does not.
- The two therefore drift, and the script cannot be retired — a standing violation of ARCH-005.

The sibling concern — no temporary id surviving into the corpus — is **not** part of this story: CON-027 already guarantees it, enforced at promotion by refusing any draft that references an unbound `-TMP-` id, scanned over the draft's full text (prose included), so there is nothing to add.

**Solution Approach**
Widen the reference-rot member — revising CON-029 — to walk every non-excluded `.md` in the project, not just the spec tree, and to resolve `@`-includes beside markdown links.

- **Corpus.** Reuse the exclusion model the code scan already applies (the built-in exclusions and the project's `exclude` / `unexclude`, CON-016/017/018), and additionally except the configured **drafts** location — drafts reference unpromoted temporary specs by design, so checking them would read every intentional temp reference as dangling.
- **Includes.** Resolve `@import` / `@`-includes as reference forms too, exactly as the script does, so a moved governance file is caught.
- **Retire.** Point the pre-commit hook at `clew check` and delete `scripts/check-references.mjs`, fulfilling ARCH-005.

This adds no new invariant: the check is still "a link resolves"; only the corpus it runs over widens.
CON-029 is therefore revised — broadened from spec-relation links to every document link, and renamed so its slug matches (`relation-link-resolves` → `document-link-resolves`), with its anchor in the check suite updated — rather than a new spec being added.

**Affected specs and artifacts**
- CON-029 — **revised**: broaden from "every relation link, under `## Relations`, resolves to a spec" to "every link and `@`-include in every non-excluded document resolves to its target"; rename its slug to `document-link-resolves` and update the anchor in the reference-rot member.
- ARCH-005 — **fulfilled**: the repo-local reference script is retired, so reference integrity is wholly a suite member; no wording change.
- SW-034 (`check` command) — surface unchanged; the widened member runs under it.
- `scripts/check-references.mjs` — deleted; the lefthook pre-commit reference step becomes `clew check`.
- No new spec.

**Acceptance Criteria**
- `clew check`'s reference-rot reports a dangling link in an ADR, in `CLAUDE.md`, in a governance baseline, and in a skill — not only in a spec or story.
- It resolves `@import` / `@`-includes and reports a dangling one.
- It honours the exclusion model and excepts the drafts location: a temporary-id link inside a draft is not reported.
- `scripts/check-references.mjs` is deleted and the pre-commit hook's reference step runs `clew check`; a planted dangling link fails the commit through `clew check`.
- Vitest covers: a dangling link found outside the spec tree (an ADR, a governance baseline, a skill); an `@`-include resolved, and a dangling one reported; a draft's temporary-id link not reported; the exclusion model honoured.

**Out of scope**
- The no-temporary-id-in-the-corpus guarantee — already held by CON-027 at promotion; not revisited.
- The `spec-id-in-comment` sweep — clearing the current `registry.ts` comment so `clew check` exits zero is a **precondition** for pointing the hook at `clew check`, tracked separately; the reference-rot widening itself does not depend on it.
- Validating relation *types* or their inverses — CON-029 stays type-agnostic; it checks that a link lands on a real target, not what edge it expresses.
- Broadening any other suite member (invalid-status, duplicate-id, document-schema) beyond its current corpus.

## Relations

**Realizes**

- Revises and delivers [CON-029](../specs/CON-029-document-link-resolves.md) — broadened to every document link.
- Fulfills [ARCH-005](../specs/ARCH-005-checks-are-one-suite.md) — the repo-local reference script is retired.

**Related (existing corpus)**

- Runs under [SW-034](../specs/SW-034-check-command.md).
- Reuses the exclusion model of [CON-016](../specs/CON-016-scan-builtin-exclusions.md) and [CON-017](../specs/CON-017-exclusion-precedence.md).
- Leaves untouched the temporary-id guarantee of [CON-027](../specs/CON-027-no-temporary-id-in-promoted-corpus.md).

## Changes

- **2026-07-10** — Retargeted the CON-029 link to its renamed file (`relation-link-resolves` → `document-link-resolves`) as the story's implementation began.
Reference-only; the story's meaning is unchanged.
