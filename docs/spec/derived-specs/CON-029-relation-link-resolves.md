**Title**
Every relation link resolves to an existing spec

**Lens**: CON

**Status**: active

**Description**
Every link a spec or story makes under its `## Relations` resolves to a spec that exists in the corpus.
A link to an id, or a file, that does not exist is a dangling reference and is rejected with its location.
The check is **type-agnostic**: it verifies the edge lands on a real node, not what kind of edge it is — the relation vocabulary (which relation types a project uses, and what each may point at) is project-defined and not this check's concern.
The relation graph is only meaningful if every edge lands on a real node; a link pointing at nothing is rot.

**Rationale**
The relations are the traceability graph the corpus exists to preserve; a link to a spec that was renamed or removed silently breaks a path through that graph — exactly the drift the project fights — and nothing catches it today outside a repo-local script.
Keeping the check type-blind keeps it correct for any project: clew reads the *links* to confirm they resolve, but needs none of the project's relation vocabulary to do so — validating relation *types* and their inverses is a separate concern.
Stating it as its own invariant gives the `clew check` reference-rot member a single decision to anchor against, so what the check enforces is itself traceable.

**Verification Description**
A relation link to an existing spec is accepted; a link to a non-existent spec id, or a missing target file, is reported with its location.

## Relations

**Realizes**

- [SYS-003 — The system allocates unique, stable, persistent spec ids](SYS-003-stable-spec-identity.md)

**Related**

- Enforced as a standing check by [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](../stories/STR-024-clew-check-suite.md) — the reference-rot member of the suite.
- Sits beside the other corpus invariants the suite checks: [CON-022 — valid status](CON-022-valid-status.md), [CON-025 — one file per spec id](CON-025-one-file-per-spec-id.md), and [CON-027 — no temporary id in the promoted tree](CON-027-no-temporary-id-in-promoted-corpus.md).
