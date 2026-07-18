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
- The skill drafts a workspace-setup story with a temporary id, carrying the steps read → verify → interview-on-doubt → set up; it neither promotes nor executes it. A new project always gets one; for an existing project the skill judges whether one is needed — drafting a reconcile story only where the workspace does not yet match the derived `004` and architecture, and stating the no-story decision otherwise.
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
- **2026-07-18** — Established that the skill **preserves user-supplied documentation, it does not distil it**.
When the user provides an architecture document, the skill now carries it into `docs/spec/architecture.md` faithfully — diagrams and all — adding what it lacks and reconciling it, rather than stripping it to a lean page; it trims only what genuinely does not belong in an overview, and surfaces each such cut for approval.
The earlier "consolidate its *relevant* content" wording, read alongside the lean worked example, led an agent to reduce a rich user-provided document by default and offer to fold the detail back — the wrong polarity. Authoring lean applies to what the agent writes from scratch, never to shrinking what the user gave.
- **2026-07-18** — Made the setup-story drafting conditional for an existing project.
A new project has no workspace, so it always needs one built and always gets the story; an existing project already has one, so drafting a story for it unconditionally produced an empty, ceremony-only artifact whenever the workspace already matched the derived frame.
The skill now **judges** whether a story is warranted for an existing project — drafting a reconcile story only where the workspace does not match the derived `004` and architecture, and stating the no-story decision otherwise. Adopting a project that already matches its documented frame yields the frame alone, and the ordinary draft-and-anchor loop begins on the code that exists.
The unconditional "always drafts a story" behaviour is dropped; greenfield is unchanged.
- **2026-07-18** — Had the skill defer the *prose* of the `004` and the architecture overview to the project's installed writing, documentation, or requirements skills, while keeping what those documents must contain — the invariant, the stack-only `004`, the preserve rule, the enforceable-rules plan — authoritative.
The authoring skill informs how well a document reads, not what it must say; where the two disagree, the skill's rules win.
Mirrors the same delegation carried by `clew-implement` (the actual coding) and `clew-draft` (the actual authoring): clew owns the frame, the installed skills own the craft.
