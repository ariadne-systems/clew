**Title**
Every document link resolves to an existing target

**Lens**: CON

**Status**: active

**Description**
Every link, and every `@`-include, that any document in the project makes resolves to a target that exists — whether the document is a spec, a story, an architecture decision record, a governance file, a skill, or any other committed markdown.
The reference-rot member walks every non-excluded document, not only the spec tree, and reports a link or include that resolves to nothing, and a `#fragment` that names no heading in its target, with its location.
The **drafts** location is excepted: a draft references unpromoted temporary specs by design, so checking it would read every intentional temporary reference as dangling.
The check is **type-agnostic**: it verifies the reference lands on a real node, not what kind of edge it is — the relation vocabulary (which relation types a project uses, and what each may point at) is project-defined and not this check's concern.

**Rationale**
The links across the corpus — spec relations, ADR references, the governance load order, a skill's cross-links — are the traceability and navigation the corpus depends on; a link to a file that was renamed or removed silently breaks a path through it, exactly the drift the project fights, and nothing catches it outside a repo-local script.
Enforcing this over the whole document set, as one member of the shipped suite, is what lets a project drop that script (ARCH-005) and inherit the check by running `clew check`.
Keeping it type-blind keeps it correct for any project: clew reads the *links* to confirm they resolve, but needs none of the project's relation vocabulary to do so — validating relation *types* and their inverses is a separate concern.

**Verification Description**
A link — in a spec, a story, an ADR, a governance file, or a skill — to an existing target is accepted; a link or `@`-include to a missing file, or a `#fragment` naming no heading in its target, is reported with its location.
A link inside the excepted drafts location, or to an excluded path, is not reported.

## Relations

**Realizes**

- [SYS-003 — The system allocates unique, stable, persistent spec ids](SYS-003-stable-spec-identity.md)

**Related**

- Enforced as a standing check by [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](../stories/STR-024-clew-check-suite.md) — the reference-rot member of the suite.
- Sits beside the other corpus invariants the suite checks: [CON-022 — valid status](CON-022-valid-status.md), [CON-025 — one file per spec id](CON-025-one-file-per-spec-id.md), and [CON-027 — no temporary id in the promoted tree](CON-027-no-temporary-id-in-promoted-corpus.md).

## Changes

- **2026-07-10** — Broadened from "every relation link, under `## Relations`, resolves to a spec" to "every link and `@`-include in every non-excluded document resolves to its target," and renamed the slug `relation-link-resolves` → `document-link-resolves` to match (STR-030).
The invariant — a reference lands on a real node — is unchanged; its corpus widens from the spec tree to the whole document set, drafts excepted, so `clew check` subsumes the repo-local reference lint and ARCH-005 is met without one.
