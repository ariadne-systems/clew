# ariadne-thread-cli — agent context

Load the governance contract before working, in numerical order:

@.claude/.ai-project-context/000-agent-instructions.md
@.claude/.ai-project-context/001-charta.md
@.claude/.ai-project-context/002-architecture.md
@.claude/.ai-project-context/003-developer-guidelines.md
@.claude/.ai-project-context/004-technology-contract.md
@.claude/.ai-project-context/005-testing-contract.md
@.claude/.ai-project-context/006-spec-conventions.md

The contract is general; the task enters per session.
For this project the task is a story in `docs/spec/stories/` and its linked specs in `docs/spec/derived-specs/`.
Those specs are the source of truth for what to build and for traceability.

This is a TypeScript project.
The global CLAUDE.md's Java, Spring, and Maven conventions do not apply here; `004` and `005` govern the stack.

## Before you change code — get familiar first

The first move on **any** code change — an edit or a new addition — is to understand the code you are about to touch. Never edit blind.

If the code is anchored to a spec (`realizes` / `verifies`), read that spec and make the change from its **intent**, not from what the code currently does. An anchor is a checked *claim*, not a proof of correctness: where the code has drifted from the spec, working from the intent — rather than preserving the existing behaviour — is what surfaces the bug.

For anything beyond a trivial edit, run the `clew-context` skill first: it walks from the code to the specs that govern it (across the call graph and up the file/module tree), so you change the code knowing the intent it must honour.

## Running the CLI (for skills and commands)

The skills write commands as `clew <command>`.
In this repository — the tool's own source — the CLI runs through the dev runner, not a global binary.
Resolve every `clew <command>` to this; do not probe for a global `clew`/`ariadne` binary or for `npx` / `pnpm exec`.

- `pnpm dev <command>` runs any command — for example `pnpm dev promote`, `pnpm dev config`.
- `pnpm mint …` is shorthand for `pnpm dev mint …`.

The command surface is stable: `init`, `mint`, `setup`, `spec`, `config`, `promote`.
Skip the `clew --help` discovery step here; read a specific command's `--help` only when you need a flag you do not already know.
