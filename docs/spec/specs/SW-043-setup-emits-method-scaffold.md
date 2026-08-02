**Title**
Setup emits the method scaffold to the agent's caller-supplied locations

**Lens**: SW

**Status**: active

**Description**
Setup emits the agent-facing method — the governance baselines (`000`–`003`, `006`) and the clew skills — into the agent's **locations**: the skills directory, the governance directory, and the governance entry file, plus a `type` label naming the agent (ARCH-008).
`--type <name>` names a known agent, and clew fills its locations from the presets registry, so the agent supplies only its own name; `--skills-dir` / `--governance-dir` / `--entry-file` override per field, or stand alone for a custom agent. An unknown `--type` given no explicit locations is rejected; a bare run uses the default (Claude).
The resolved locations are recorded in the configuration's `agent` attribute; a re-run with no options re-emits to the recorded locations, so the method stays current without re-specification. The `type` is a recorded label — the engine never branches on it.
The emitted files are tool-owned and re-emitted whole on each run (CON-033).

**Rationale**
The governance an agent must obey and the skills that drive the loop are the same for every project; emitting them at setup is what makes a scaffolded project workable by an agent rather than a bare configuration.
Recording the locations lets a re-run refresh the method to the tool's current version without the human restating where it lands, keeping the method a tool-owned projection rather than a one-time copy.

**Verification Description**
`clew setup` with no options writes the governance baselines and the clew skills into the default (Claude) locations, each carrying the tool-owned marker, and records the default `agent` locations.
`clew setup --type cursor` resolves the cursor preset, emits into those locations, records them, and writes nothing to the default's; `--skills-dir` and its siblings override per field, and an unknown `--type` given no explicit locations is rejected. A re-run with no options re-emits to the recorded locations.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Emits into the agent's locations per [ARCH-008](ARCH-008-method-behind-harness-adapter.md)'s seam.
- The emitted files' ownership is governed by [CON-033](CON-033-method-scaffold-tool-owned.md).
- Extends the scaffolding of [SW-011](SW-011-scaffold-default-config.md); records the `agent` attribute of [ENT-002](../domain-model.md#ent-002-configuration).

## Changes

- **2026-07-12** — Set active: implementation of STR-031 began.
- **2026-08-02** — Revised: setup now emits to the agent's locations recorded as the config's `agent` attribute — resolved from `--type <name>` against the presets registry (the agent gives only its name), or from `--skills-dir` / `--governance-dir` / `--entry-file` for a custom agent — replacing the `--agent` harness selection and the bare `agent` string (STR-043; ARCH-008 / ADR-0008 revision).
`--agent` is removed.
