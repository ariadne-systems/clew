**Title**
Setup emits the method scaffold through the configured harness adapter

**Lens**: SW

**Status**: planned

**Description**
Setup emits the agent-facing method — the governance baselines (`000`–`003`, `006`) and the clew skills — through the harness adapter configured for the project, resolved via the interface (ARCH-008).
The harness is taken from a `--agent <harness>` option, defaulting to Claude, and recorded in the configuration's `agent` attribute; a re-run with no `--agent` re-emits for the recorded harness, so the method stays current without re-specification.
An unknown harness is rejected with a non-zero exit before any file is written.
The emitted files are tool-owned and re-emitted whole on each run (CON-033).

**Rationale**
The governance an agent must obey and the skills that drive the loop are the same for every project; emitting them at setup is what makes a scaffolded project workable by an agent rather than a bare configuration.
Recording the harness lets a re-run refresh the method to the tool's current version without the human restating which harness, keeping the method a tool-owned projection rather than a one-time copy.

**Verification Description**
`clew setup` with Claude selected (the default) writes the governance baselines and the clew skills into the Claude harness's locations, each carrying the tool-owned marker, and records `agent: claude` in the configuration.
The emission resolves the adapter through the interface — the engine names no concrete adapter outside the registry.
Re-running with no `--agent` re-emits for the recorded harness; `clew setup --agent <unknown>` exits non-zero before any write.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)

**Related**

- Emits through the interface defined by [ARCH-008 — The agent-facing method is emitted through a harness-adapter interface](ARCH-008-method-behind-harness-adapter.md).
- The emitted files' ownership is governed by [CON-033 — The method scaffold is tool-owned; project files are never overwritten](CON-033-method-scaffold-tool-owned.md).
- Extends the scaffolding of [SW-011 — Scaffold the default configuration and layout](SW-011-scaffold-default-config.md); records the `agent` attribute of [ENT-002 — Configuration](../domain-model.md#ent-002-configuration).
