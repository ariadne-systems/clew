**Title**
Setup places the method at a caller-supplied location, not a per-agent adapter

**Status**: done

**Business Value**
Supporting a second agent today means shipping a second in-tree adapter with that agent's paths hard-coded — a per-agent map, carried as code, that the engine must maintain and that rots whenever an agent changes its convention.
The running agent already knows where it reads its own skills; encoding foreign agents in the core is knowledge the core should not hold.
Moving the placement out of the engine and into the caller lets any agent bootstrap clew with no code change, and lets a project's setup be one skill-governed flow instead of a CLI step a human runs and a skill that guides the rest.

**Problem / Context**
The agent-facing method is emitted through a *named per-harness adapter*: `--agent <harness>` selects an adapter from a registry that lists `createClaudeHarness()`, and that adapter hard-codes `.claude/.ai-project-context` and `.claude/skills` (ARCH-008, SW-043; ADR-0008 D2/D3).
Adding an agent is therefore "one more in-tree adapter plus one registration line" — the placement map as code.
This makes the core depend on volatile, target-specific knowledge it need not hold (`002` §2): the only thing that varies per agent is *where the files land*, and the agent that runs setup already knows that for itself.
Separately, setup is two moves — run the CLI, then follow the skill — where it could be one.

**Solution Approach**
- **The method is emitted to the agent's locations, held as data.**
Where the skills and the layered governance land — a skills directory, a governance directory, and a governance entry file — is data, not a per-agent code module. A single generic emitter writes the neutral materials into whatever locations it is given; the shipped default is Claude's, so a bare run is unchanged.
- **The known agents live as data at a single presets registry.**
clew ships each known agent's locations as a data entry at one registry (`harness/presets.ts`), verified against that agent's own documentation. `--type <name>` resolves one, so the agent supplies only its **own name**; `--skills-dir` / `--governance-dir` / `--entry-file` override per field or stand alone for a custom agent. Same single-registry shape as the generators (ARCH-003), but the entries are *data* (paths), not modules — and the emitter branches on no agent.
- **The governance stays layered; the entry file lists it.**
The `000`–`006` files remain separate, human-readable files (not inlined). The entry file (`CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`) lists them in load order: Claude and Gemini treat each `@path` line as a hard import; the `AGENTS.md` agents read the same list and open the files themselves — a softer guarantee, accepted deliberately since AGENTS.md has not standardized an import directive.
- **`clew setup` takes the agent, and only the agent.**
`--type <name>` (or the placement flags) replaces the old `--agent <harness>`, which is **removed** — a breaking change this story authorizes. The resolved locations, with a `type` label naming the agent, are recorded in the configuration's `agent` attribute (ENT-002), replacing the former bare `agent` string; a re-run with no options re-emits to the recorded locations.
- **The bootstrap is one agent action; the configure is the next.**
Following the README's bootstrap prompt, the running agent runs `clew setup --type <itself>` — it knows its own name — and a **fresh session** then loads the skills and governance (or the agent reads the just-installed files directly to continue).
The bootstrap (Phase 0) is *only* placement: it records the agent and leaves `generators` empty. The `clew-setup` skill (Phase 1, agent-driven) is the configure workflow — it establishes the stack (`004`), **wires the generator matching it** (`clew setup --generator <lang>`, filling the empty section), and the architecture. So the generator and the other configure choices live in Phase 1, not the bootstrap; the skill reads the governance directory from `clew config` rather than assuming one.
- This **revises ARCH-008** (the seam), **SW-043** (setup emission), and **ENT-002** (the `agent` attribute) to the presets-registry model, and **ADR-0008 D2/D3** to match.

**Acceptance Criteria**
- `clew setup --type <name>` resolves that agent's locations from the presets registry and emits the governance baselines and skills into them; a bare `clew setup` uses the default (Claude). An unknown `--type` given no explicit locations is rejected before anything is written.
- `--skills-dir` / `--governance-dir` / `--entry-file` override the resolved locations per field, or stand alone for a custom agent; the old `--agent` option is removed — a run passing it fails as an unknown option (breaking change).
- The resolved locations, with a `type` label, are recorded in the configuration's `agent` attribute (ENT-002), replacing the former bare `agent` string; a re-run with no options re-emits to the recorded locations.
- The `000`–`006` governance files are emitted as separate, layered files (not inlined); the entry file lists them in load order — Claude and Gemini hard-import the list, the `AGENTS.md` agents read it (a softer guarantee, stated as such).
- clew ships presets for **claude, gemini, cursor, zed, amp, codex, copilot** at first release, each verified against that agent's live documentation. clew tests the Claude path end-to-end; the others are built to their documented conventions, untested by clew — which the README's positioning note states plainly.
- A further agent is **one data entry** in the presets registry, or a caller's placement flags — no new emitter code. An architecture test asserts that no production source *outside the presets registry* names a target agent.
- The bootstrap is a single README-published prompt: the running agent runs `clew setup --type <itself>`, then a fresh session (or reading the installed files directly) picks up the method. The `clew-setup` skill is placement-aware — it locates the `004` and governance via `clew config`, not a hard-coded `.claude/.ai-project-context`.
- The bootstrap (Phase 0) leaves `generators` empty; the `clew-setup` skill (Phase 1) wires the generator to the established stack (`clew setup --generator <lang>`, which fills an empty `generators` section), so the generator is set in the agent-driven configure phase, not only at the bootstrap.
- The README and `docs/guide/` install and usage instructions match the shipped model (`--type`, presets, the bootstrap, the removal of `--agent`), and the README's opening carries an honest positioning note: developed and **tested with Claude Code**; Gemini/Cursor/Zed/Amp/Codex/Copilot built to their documented conventions but **untested by us**; skills in the open **Agent Skills** (`SKILL.md`) format; feedback on non-Claude use explicitly welcome.
- ARCH-008, SW-043, and ENT-002 are revised with `## Changes` entries, and ADR-0008 gains a `## Revision`; the specs' verification descriptions falsify against the current text.
- Tests cover: default emission, `--type` preset resolution, per-field override, the unknown-type rejection, the config recording plus re-run, and that no production source outside the presets registry names an agent.

**Out of scope**
- **Agents beyond the shipped presets** — a further agent is a one-line data entry when identified, or a caller's placement flags for a one-off; not built here.
- **A standardized single import directive** across all agents. AGENTS.md has not standardized imports yet (open issue); the `AGENTS.md` agents rely on the soft "read the listed files" guarantee until it does.
- **Any change to the neutral method content** (governance baselines, skill logic) beyond the `clew-setup` skill's placement-awareness.

## Relations

**Realizes**

- [ARCH-008](../specs/ARCH-008-method-behind-harness-adapter.md) — revised: the seam becomes neutral materials + caller-supplied placement.
- [SW-043](../specs/SW-043-setup-emits-method-scaffold.md) — revised: setup emits to a placement (default or override) recorded in config; `--agent` removed.

**Related**

- Serves [SYS-004](../specs/SYS-004-configuration-and-state.md) — the configuration-and-state capability the seam realizes; unchanged.
- Revises the Configuration entity [ENT-002](../domain-model.md#ent-002-configuration) — its `agent` attribute is replaced by the recorded placement.
- Revises [ADR-0008 — The agent-facing method is emitted through per-harness adapters](../../adr/ADR-0008-harness-adapter-for-agent-facing-method.md) (D2/D3).
- Sibling of [ARCH-003](../specs/ARCH-003-generator-interface.md): the generator seam stays per-target-language modules; only the harness axis moves to caller-supplied data. The two patterns diverge here — noted, not silently.
- Ownership of the emitted files is unchanged — [CON-033](../specs/CON-033-method-scaffold-tool-owned.md) still governs them as tool-owned.
