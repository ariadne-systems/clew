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
Add a `clew-workspace` skill that runs after `clew-setup`:
interview the user for the stack; verify the current standards from each tool's documentation rather than memory; fill the seeded `004` (kept to the stack — architecture and tooling stay the developer's); and draft a workspace-setup story whose steps are read the `004`, verify standards, ask the user on any doubt, then set up the workspace.
The skill produces artifacts only — a filled `004` and a **draft** story; the user promotes the story (`clew-promote`) and the agent executes it, so the build is gated behind promotion.
The skill ships as part of the method scaffold (SW-043) and needs no tool-code change.

**Acceptance Criteria**
- A `clew-workspace` skill exists in the shipped method (`.claude/skills`, synced to `templates/skills`), and `clew-setup` points to it as the next step.
- The skill fills the seeded `004` from an interview and verified current standards (not memory), tailored to the project, kept to the stack.
- The skill drafts a workspace-setup story with a temporary id, carrying the steps read → verify → interview-on-doubt → set up; it neither promotes nor executes it.
- The skill builds no workspace artifacts itself and asks the user on decisions the developer owns (architecture, tooling, structure).
- Project bootstrap is delivered as a skill: it has no anchors and generates no traceable, so it is outside the coverage universe.

**Out of scope**
- Executing the workspace setup — the agent does that after the story is promoted.
- Generating the buildable application skeleton (`pom.xml`, `package.json`, source tree).
