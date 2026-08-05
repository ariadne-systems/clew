**Title**
Close an increment from spec to Covered through an agent skill

**Status**: done

**Business Value**
A developer takes a promoted spec to working, tested, anchored, **Covered** code by directing the agent once.
The coding is done the project's own way, and the traceability is closed as the increment is built — not reconstructed afterwards.

**Problem / Context**
The shipped method has a skill for every step of the loop except the one that turns a promoted spec into code.
`clew-setup`, `clew-draft`, `clew-context`, `clew-promote`, and `clew-anchor` exist; closing an increment — set the spec `active`, regenerate, implement, test, anchor, verify **Covered** — is left to ad-hoc direction.
`clew-anchor` places markers but does not own the surrounding choreography (activation, regeneration, the coverage check), and nothing ties the steps into one reviewable increment.
Two failure modes follow: the agent forgets to set the spec `active` or to regenerate, so no symbol exists to anchor against; or it reinvents how to write the code instead of following the project's own implementation and testing skills.

**Solution Approach**
Add a `clew-implement` skill to the shipped method that closes one increment and owns only the **clew frame** around it:

1. set the target spec `active` — with its `## Changes` entry (`006`) — and regenerate the traceables, so a symbol exists to anchor against;
2. read the spec's **intent**, delegating to `clew-context`, and implement from the intent rather than from the current code;
3. implement and test the behaviour **following the project's own installed implementation, testing, and language skills** and its `003`/`005` conventions — the skill does not re-specify how to code;
4. anchor the code and test by delegating to `clew-anchor`;
5. verify via `clew coverage` and `clew check`, scoped to the increment.

It does not author or promote specs (`clew-draft`, `clew-promote`), and it reuses `clew-anchor` rather than placing markers itself.
**Covered** proves the spec-to-code link, not the code's correctness, so the skill presents the change for review and never reads Covered as done.
A targeted spec left uncovered sends the agent back to find what is missing, and to the user if it finds nothing — it never invents an anchor to move the number; any *other* open coverage is reported, not force-anchored.
Like `clew-setup` (STR-032), the skill ships as part of the method scaffold (SW-043) and needs no tool-code change; it has no anchors and generates no traceable, so it is outside the coverage universe.
The quickstart's implement step points to it.

**Acceptance Criteria**
- A `clew-implement` skill exists in the shipped method (`.claude/skills`, synced to `templates/skills`), delivering the increment-closing loop: set the spec `active` and regenerate → read intent → implement and test → anchor → verify coverage.
- The skill delegates rather than duplicates — intent to `clew-context`, marker placement to `clew-anchor` — and does not author or promote specs (`clew-draft`, `clew-promote`).
- The actual implementation and testing **follow the project's own installed skills** and its `003`/`005` conventions; the skill does not re-specify how to write code or tests.
- Setting the spec `active` records a `## Changes` entry, and the traceables are regenerated before anchoring; a spec that is `planned`-only, unpromoted, or `deprecated` stops the skill rather than being anchored.
- Verification is scoped to the increment: every spec it targeted must report **Covered**; a targeted spec left uncovered sends the agent back to find the gap, and to the user if it finds none; any other open coverage is reported, not forced.
- The skill treats Covered as proof of the link only, not of correctness, presents the change for review, and commits nothing.
- Closing an increment is delivered as a skill: it has no anchors and generates no traceable, so it is outside the coverage universe.

**Out of scope**
- The coding and testing method itself — the project's own installed skills and its `003`/`005` conventions are deferred to, not redefined here.
- Authoring or promoting specs (`clew-draft`, `clew-promote`) and placing the trace markers (`clew-anchor`) — reused, not redefined.
- Harness adapters beyond Claude — the skill ships through the same method scaffold (SW-043) for whichever harness is configured.
