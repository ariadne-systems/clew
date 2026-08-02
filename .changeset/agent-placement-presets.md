---
"@ariadne-thread/clew": minor
---

`clew setup` now emits the agent-facing method to caller-supplied **locations** instead of through a per-agent adapter, and names the target agent with `--type`.

- **`--type <name>`** resolves a known agent's locations from a shipped presets registry — `claude` (the default), `gemini`, `cursor`, `zed`, `amp`, `codex`, `copilot` — so an agent supplies only its own name. `--skills-dir` / `--governance-dir` / `--entry-file` override per field, or stand alone for a custom agent.
- **Breaking:** `--agent <harness>` is removed, and the configuration's `agent` attribute widens from a bare harness string to `{ type, skillsDir, governanceDir, entryFile }`. An older configuration (an absent or string `agent`) resolves to the default, so no migration is needed.
- The method is emitted through one generic path that names no target agent — only the presets registry does. The governance stays layered: the entry file (`CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`) lists the `000`–`006`, hard-imported by Claude and Gemini and read as a list by the `AGENTS.md` agents.
- Integration for Gemini, Cursor, Zed, Amp, Codex, and Copilot ships built to each agent's documented conventions, tested only under Claude Code — feedback welcome.
- The `clew-setup` skill now wires the generator to the established stack, so the bootstrap stays minimal (`clew setup --type <agent>`) and the configure work is agent-driven.
