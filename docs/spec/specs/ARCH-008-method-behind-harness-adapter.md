**Title**
The agent-facing method is emitted behind a harness seam, to caller-supplied locations

**Lens**: ARCH

**Status**: active

**Description**
Emitting the agent-facing method — the generic governance baselines and the clew skills — is the job of a single emitter parameterized by the agent's **locations**: the skills directory, the governance directory, and the governance entry file — not a per-agent module.
The engine holds the method as harness-neutral materials, with no agent path or format baked in; given those locations, the emitter writes the materials into them.
The known agents' locations live as **data at a single presets registry** — the one place clew names a target agent, mirroring how generators are named only at their registry (ARCH-003). `--type <name>` resolves an agent's locations from it, so an agent supplies only its own name; a custom agent supplies its locations directly instead.
The **emitter branches on no agent** — it consumes a resolved placement uniformly — and an architecture test enforces that no production source *outside the presets registry* names a target agent. A further agent is one added data entry in the registry, never new emitter code, and the neutral materials do not move.

**Rationale**
The method's content is the same across agents; only where it lands, and which entry file loads it, differs — and that variance is *paths*, not behaviour, so it belongs as data, not code.
Holding the known agents' locations as data at one registry keeps the method authored once and keeps a new agent to one data entry — no adapter module to write — while an agent supplies only its own name, which it always knows.
This is the same shape as the generator registry (ARCH-003): a single point naming the concrete targets. The entries differ in kind — the presets are *data* (paths), the generators *modules* (a generator carries real per-language behaviour, an agent only paths) — so the two seams stay siblings, one data-valued, one code-valued.

**Verification Description**
`--type <known>` resolves that agent's preset locations and emits there, writing nothing to the default's; an unknown `--type` given no explicit locations is rejected. A bare run uses the default (Claude); explicit `--skills-dir` and its siblings override per field.
An architecture test asserts that no production source *outside the presets registry* names a target agent, so the emitter branches on none.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Sibling of [ARCH-003](ARCH-003-generator-interface.md): both name their concrete targets at a single registry — the generators as *modules*, the agents as *data* (paths). Same shape, different entry kind.
- Realizes [ADR-0008 — The agent-facing method is emitted through per-harness adapters](../../adr/ADR-0008-harness-adapter-for-agent-facing-method.md), as revised (D2/D3): the agents are data at a presets registry, not a per-harness adapter module.

## Changes

- **2026-07-12** — Set active: implementation of STR-031 began.
- **2026-08-02** — Revised the seam from a per-harness adapter *module* per agent (bound at the generator registry) to **caller-supplied locations over one generic emitter**, with the known agents' locations as **data at a single presets registry** (`harness/presets.ts`) that `--type <name>` resolves (STR-043; ADR-0008 revision).
The presets registry is the one place clew names an agent — mirroring the generator registry (ARCH-003); the emitter branches on none. The architecture test shifted from "no concrete adapter named outside the registry" to "no production source *outside the presets registry* names a target agent".
The slug is retained: the method is still emitted behind a harness seam; only the per-agent *modules* became per-agent *data*.
