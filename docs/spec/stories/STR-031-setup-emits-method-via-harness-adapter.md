**Title**
`clew setup` emits the agent-facing method via a harness adapter

**Business Value**
A scaffolded configuration lets the *tool* run (STR-029), but an *agent* still cannot work the project's method.
The generic governance contract — the `000`–`003` and `006` baselines — and the clew skills that drive the loop live in this repository and are not shipped by setup, so a human hand-copies them into every new project.
This story has setup emit that agent-facing method into the project, materialized for the project's agent harness, so after setup an agent has the governance it must obey and the skills that run the loop — not a bare configuration it cannot act on.

**Problem / Context**
The agent-facing half of the method is harness-neutral in content but harness-specific in materialization (ADR-0008): the same governance and skills, but an agent under Claude Code reads them from its own locations and an agent under another harness from theirs.
Setup has no mechanism to write them, and it does not seed the project-owned governance files the baselines reference (`004` technology contract, `005` testing contract, `architecture.md`) either.
Nothing today makes a scaffolded project workable by an agent without manual assembly.

**Solution Approach**
Per ADR-0008.

1. **The harness-adapter interface.**
Model the agent-facing method as harness-neutral **method materials** (the governance baselines and the skills, with no harness path baked in) behind a narrow `HarnessAdapter` interface, one in-tree implementation per harness, bound at the single registry point that already binds the generators and enforced by the same architecture test (sibling to ARCH-003).
One adapter ships now: Claude.

2. **Emit the method.**
Setup emits the method through the configured adapter and records the chosen harness in the configuration, so a re-run re-emits for the same harness with no re-specification.
The emitted method files are tool-owned and re-emittable and never overwrite a project-owned file.

3. **Seed the project stubs.**
Setup seeds the project-owned half of the governance contract — `004`, `005`, `architecture.md` — as clearly-marked skeletons, once; they belong to the project thereafter and setup never rewrites them.

4. **Seed the ADR practice.**
Setup creates `docs/adr/` and emits a tool-owned ADR template — the harness-neutral part of the method, written to a fixed location rather than through the adapter — so a project can record its structural decisions in the shape its ARCH specs reference.
The method thus has two parts: the harness-specific materials (governance baselines and skills) the adapter places, and the harness-neutral ADR template written directly; both are tool-owned.

The chosen harness is a new additive attribute on the configuration entity (`agent`); ENT-002 grows by adding it, its shape otherwise unchanged.
The generator and schema scaffolding is the sibling story STR-029 and is out of scope here.

**Affected specs and artifacts** (planned; ids bound on promotion)
- ARCH — the agent-facing method is emitted through a **harness-adapter interface**, one in-tree implementation per harness (Claude first), bound at the registry; sibling to ARCH-003, realizing ADR-0008.
- SW — setup emits the method scaffold (governance baselines + skills) through the configured harness adapter and records the chosen harness for re-emission.
- SW — setup seeds the project governance stubs (`004`, `005`, `architecture.md`) as marked skeletons, once.
- SW — setup seeds the ADR practice with a tool-owned template at a fixed location (harness-neutral method); sibling to the per-harness emission.
- CON — the emitted method scaffold is tool-owned and re-emittable, and never overwrites a project-owned file (mirrors CON-012, extends CON-010; ADR-0008 D4).
- ENT-002 gains an `agent` attribute (additive) recording the chosen harness.

**Acceptance Criteria**
- Setup emits the governance baselines (`000`–`003`, `006`) and the clew skills through the harness adapter for the selected harness; with Claude selected (the default), the files land in the Claude harness's locations and carry the tool-owned marker.
- The method emission goes through the harness-adapter interface only — the engine names a concrete adapter only at the single registry point, enforced by the architecture test.
- The chosen harness is recorded in the configuration; re-running `clew setup` with no `--agent` re-emits for the recorded harness.
- Re-running setup regenerates the tool-owned method files but leaves every project-owned file — the configuration, the stubs, and any spec — byte-for-byte unchanged.
- Setup seeds `004`, `005`, and `architecture.md` as marked skeletons; a re-run leaves each unchanged where it already exists (CON-010).
- Setup creates `docs/adr/` with a tool-owned ADR template carrying the tool-owned marker; a re-run re-emits the template but never overwrites a project's own ADR.
- `clew setup --agent <unknown>` exits non-zero before any file is written.
- Vitest covers: the method emitted through a fake adapter via the interface; the engine naming no concrete adapter outside the registry; the harness recorded and re-emission targeting it; the stubs seeded once; project-owned files never overwritten.

**Out of scope**
- Harness adapters beyond Claude (Cursor / Codex / Gemini) — additive later behind the same seam (ADR-0008 D3).
- Authoring project-specific content — the stubs are skeletons; clew never fills the stack-specific text (ADR-0008 D5).
- The generator and schema scaffolding — the sibling story STR-029.
- The interactive prompting — which harness — is the clew-setup skill's job; this story specs the interface, the emission, and the seeding.

## Relations

**Realizes**

- [ARCH-008](../specs/ARCH-008-method-behind-harness-adapter.md)
- [SW-043](../specs/SW-043-setup-emits-method-scaffold.md)
- [SW-044](../specs/SW-044-setup-seeds-project-stubs.md)
- [SW-045](../specs/SW-045-setup-seeds-adr-practice.md)
- [CON-033](../specs/CON-033-method-scaffold-tool-owned.md)

**Related (existing corpus)**

- Realizes [ADR-0008 — The agent-facing method is emitted through per-harness adapters](../../adr/ADR-0008-harness-adapter-for-agent-facing-method.md).
- The harness-adapter boundary is the sibling of [ARCH-003](../specs/ARCH-003-generator-interface.md): the same in-tree-implementation-behind-an-interface pattern, on the harness axis.
- The tool-owned rule reuses [CON-012](../specs/CON-012-generated-files-tool-owned.md) and extends [CON-010](../specs/CON-010-setup-never-overwrites.md) from the configuration to every project-owned file.
- Extends the scaffolding of [SW-011](../specs/SW-011-scaffold-default-config.md); adds an `agent` attribute to [ENT-002](../domain-model.md#ent-002-configuration).
- Sibling story: [STR-029](STR-029-setup-scaffolds-runnable-config.md).
