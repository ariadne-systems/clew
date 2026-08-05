**Title**
Establish the `clew` CLI shell that prints help

**Status**: done

**Business Value**
The CLI is how the agent and humans drive the tool.
A small, intentional CLI shell — with clear help and one place to register commands — lets every later capability be added as its own focused command, one story at a time.

**Problem / Context**
The scaffold (STR-001) wired a minimal commander program that prints `--help` and `--version`, but it has no command structure, no behaviour on a bare invocation, and no conventions for output or exit codes.
Before any real command (mint, scan, resolve, …) is added, the CLI needs an intentional shell: a single registration point for commands and predictable help, version, and error behaviour.
This story delivers the shell only — no business commands.

**Solution Approach**
Keep commander.
Give the program a name, a description, and a version kept in sync with the CLI package's own `package.json` rather than a duplicated literal.
Make a bare `clew` and `clew --help` print the same usage.
Provide a single place where future commands are registered, so each one is added in its own module and wired in one line.
Define output conventions: human output to stdout, diagnostics and errors to stderr; exit 0 on success, non-zero on error.

Structure the package to grow command-by-command.
`src/index.ts` is the bin entry only: it builds the program, parses argv, and turns a thrown error into a stderr message and a non-zero exit.
`src/program.ts` exposes `buildProgram()`, which sets the name, description, and version and is the single place commands are registered.
Each later command lives in its own `src/commands/<name>.ts` as a `register<Name>(program)` function whose action stays thin and delegates the work to `@ariadne-thread/core`.
This story adds only `index.ts` and `program.ts`; the `commands/` directory arrives with the first command.

**Acceptance Criteria**
- `clew --help` and `clew -h` print usage: program name, description, version, and a (currently empty) commands section.
- `clew` with no arguments prints the same help and exits 0.
- `clew --version` prints the CLI version, sourced from its `package.json`, not a hard-coded literal.
- An unknown command or option prints a helpful message to stderr and exits with a non-zero code.
- The CLI exposes a single registration point for subcommands; no business commands are registered yet.
- Output convention holds: help and version go to stdout, errors go to stderr.
- Vitest covers: help output contains the program name, and an unknown command exits non-zero.

**Out of scope**
- No `mint` or any other business command; each is its own later story.
- No id generation, scanning, index, or resolution.
- No standalone binary or distribution work; the npm `bin` is sufficient, and distribution is deferred to release.
