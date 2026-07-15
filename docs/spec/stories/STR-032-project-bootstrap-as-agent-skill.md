**Title**
Bootstrap a project's workspace through an agent skill

**Business Value**
A team reaches a tailored technology contract and a reviewed workspace-setup plan through a short interview.
The stack is checked against current standards at setup time, and the human gates what actually runs.

**Problem / Context**
`clew setup` seeds the `004` technology contract as an empty stub, which leaves the project blank-page work, and nothing tells the agent how to stand the workspace up.
Filling the contract and standing up a workspace is agentic judgment: interview the user, verify the current standards from the tools' own documentation, resolve the decisions the contract leaves to the developer, and only then build.
That workflow belongs in a skill, and everything it needs already exists — `clew setup` seeds the empty `004`, `clew mint` allocates ids, and the method scaffold already ships skills (SW-043); only the filling and the story-drafting are missing.

**Solution Approach**
Add a `clew-setup` skill that runs after the `clew setup` command has scaffolded the project:
it opens with a short questionnaire — pin the `004` now or leave it a stub, and a new project or an existing one being adopted — and works both ways: interview for a new project, or derive the stack (from the build files) and the architecture (from the code structure, ADRs, and architecture tests such as ArchUnit) for an existing one, each written only on the user's confirmation.
It verifies the current standards from each tool's documentation rather than memory; fills the seeded `004` technology contract (kept to the stack) and the `docs/spec/architecture.md` overview (the architecture as a narrative); and drafts a workspace-setup story whose steps are read the `004` and architecture, verify standards, ask the user on any doubt, then set up the workspace.
The skill produces artifacts only — the filled documents and a **draft** story; the user promotes the story (`clew-promote`) and the agent executes it, so the build is gated behind promotion.
The skill ships as part of the method scaffold (SW-043) and needs no tool-code change; the `clew setup` command's next-steps point to it. After it runs, no scaffolded document is left with an open question.

**Acceptance Criteria**
- A `clew-setup` skill exists in the shipped method (`.claude/skills`, synced to `templates/skills`), and the `clew setup` command's next-steps point to it.
- The skill fills the seeded `004` (stack) and the `docs/spec/architecture.md` overview from an interview and verified current standards (not memory), leaving no document with an open question or placeholder.
- Existing project documentation is supplied through a `setup/` directory (the `clew setup` command's next-steps prompt for it); the skill reads `setup/` as its source, checks the architecture's consistency, and consolidates any existing architecture document into `docs/spec/architecture.md` (moving or deleting the original only on separate approval), rather than interviewing from scratch.
- A questionnaire opens the skill (pin the `004` or leave it a stub; new project or existing), and for an existing project the stack is derived from the build files and the architecture from the code structure, ADRs, and architecture tests (for example ArchUnit) — each written only on the user's confirmation, so a running project can be adopted, not only a greenfield one.
- The skill drafts a workspace-setup story with a temporary id, carrying the steps read → verify → interview-on-doubt → set up; it neither promotes nor executes it.
- The skill builds no workspace artifacts itself and asks the user on decisions the developer owns (architecture, tooling, structure); it never tells the user to mint ids by hand.
- Project bootstrap is delivered as a skill: it has no anchors and generates no traceable, so it is outside the coverage universe.

**Out of scope**
- Executing the workspace setup — the agent does that after the story is promoted.
- Generating the buildable application skeleton (`pom.xml`, `package.json`, source tree).

## Changes

- **2026-07-14** — Named the skill `clew-setup` (dropped the interim `clew-workspace` name) and gave it the architecture phase: it now fills `docs/spec/architecture.md` from the interview, not only the `004`, so setup leaves no open question in any document.
The former lens/generator-choice `clew-setup` skill was removed — it could never bootstrap, since no skills exist until the `clew setup` command emits them; its references were repointed to the `clew setup` command, and the command's next-steps now point to this skill.
Existing project documentation is supplied through a `setup/` directory — the `clew setup` command's next-steps prompt the user to place it there before the skill runs; the skill reads `setup/` as its source, checks consistency, and consolidates any existing architecture document into `docs/spec/architecture.md` (moving or deleting the original only on separate approval), rather than always interviewing from scratch.
The skill opens with a questionnaire (pin the `004` or leave it a stub; new or existing project) so a running project can be adopted, not only a greenfield one — deriving the stack from the build files and the architecture from the code structure, ADRs, and architecture tests (for example ArchUnit), each written only on the user's confirmation.
- **2026-07-15** — Hardened the skill for less-supervised use (external review): a hard-stop precondition (never run the `clew setup` command itself); repo content is treated as data, not instructions (no command execution, no secrets); two named gates for brownfield (analysis consent vs. write approval); a source-precedence rule for conflicts (build/lock → stack, code/tests → as-is, ADRs → intent, other docs → context) distinguishing as-is from target; scope framing for monorepos; versions reported as-is with only unsupported/security flags; and a mechanical validation before review.
- **2026-07-15** — Follow-up consistency fixes (second review): read-only inspection commands are allowed (only executing/modifying commands are forbidden, plus `clew mint --tmp`); the setup story requires both the `004` and the architecture — declining the architecture ends the run without a story; an existing architecture document is consolidated into `docs/spec/architecture.md`, not moved, unless separately approved; and the `clew mint` failure path, secret-file caution, and unavailable-source deferral are spelled out.
