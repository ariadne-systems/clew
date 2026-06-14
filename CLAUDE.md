# ariadne-thread-cli — agent context

Load the governance contract before working, in numerical order:

@.claude/.ai-project-context/000-agent-instructions.md
@.claude/.ai-project-context/001-charta.md
@.claude/.ai-project-context/002-architecture.md
@.claude/.ai-project-context/003-developer-guidelines.md
@.claude/.ai-project-context/004-technology-contract.md
@.claude/.ai-project-context/005-testing-contract.md

The contract is general; the task enters per session.
For this project the task is a story in `docs/spec/stories/` and its linked specs in `docs/spec/derived-specs/`.
Those specs are the source of truth for what to build and for traceability.

This is a TypeScript project.
The global CLAUDE.md's Java, Spring, and Maven conventions do not apply here; `004` and `005` govern the stack.
