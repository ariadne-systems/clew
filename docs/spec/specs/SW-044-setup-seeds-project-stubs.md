**Title**
Setup seeds the project governance stubs as marked skeletons

**Lens**: SW

**Status**: active

**Description**
Setup seeds the project-owned half of the governance contract — the `004` technology contract and the `005` testing contract — through the same harness adapter, into the harness's governance location, as clearly-marked skeletons the project fills.
Unlike the tool-owned baselines, these are written once, only when absent, and are never re-emitted or overwritten once they exist (CON-033, CON-010) — their content is the project's, not the tool's.
Each stub carries a marker identifying it as a scaffolded skeleton, so a reader can tell an unfilled stub from authored content.
The project's architecture is deliberately not a governance stub here: it is seeded as a narrative overview in the docs tree (SW-046) and enforced through ARCH and CON specs, on-demand rather than in the always-loaded agent context, so it is not duplicated against the generic `002` architecture baseline.

**Rationale**
The generic baselines reference project-specific contracts only the project can write — its stack and its testing rules.
Seeding them as marked skeletons gives the project the shape to fill without the tool inventing content it cannot know, and keeping them project-owned means a method re-emission never destroys what the project wrote (ADR-0008 D5).

**Verification Description**
After `clew setup`, `004` and `005` exist as marked skeletons in the selected harness's governance location, and no `architecture.md` stub is written.
A re-run leaves each unchanged where it already exists; setup writes a stub only when absent.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Seeded through the interface defined by [ARCH-008](ARCH-008-method-behind-harness-adapter.md).
- Their project-owned, never-overwritten status is governed by [CON-033](CON-033-method-scaffold-tool-owned.md), which extends [CON-010](CON-010-setup-never-overwrites.md).
- Extends the scaffolding of [SW-011](SW-011-scaffold-default-config.md).

## Changes

- **2026-07-12** — Set active: implementation of STR-031 began.
- **2026-07-12** — Removed the `architecture.md` stub from the agent-context governance.
Project architecture moved to the docs tree as a seeded narrative overview (SW-046), enforced through ARCH and CON specs — loaded on demand, not always in the agent context, and no longer duplicating the generic `002` architecture baseline.
Only the `004` technology and `005` testing contracts remain project stubs; those are genuinely per-project rules the baselines depend on.
