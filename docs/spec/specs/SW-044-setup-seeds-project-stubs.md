**Title**
Setup seeds the project governance stubs as marked skeletons

**Lens**: SW

**Status**: planned

**Description**
Setup seeds the project-owned half of the governance contract — the `004` technology contract, the `005` testing contract, and `architecture.md` — through the same harness adapter, into the harness's governance location, as clearly-marked skeletons the project fills.
Unlike the tool-owned baselines, these are written once, only when absent, and are never re-emitted or overwritten once they exist (CON-033, CON-010) — their content is the project's, not the tool's.
Each stub carries a marker identifying it as a scaffolded skeleton, so a reader can tell an unfilled stub from authored content.

**Rationale**
The generic baselines reference project-specific contracts only the project can write — its stack, its testing rules, its architecture.
Seeding them as marked skeletons gives the project the shape to fill without the tool inventing content it cannot know, and keeping them project-owned means a method re-emission never destroys what the project wrote (ADR-0008 D5).

**Verification Description**
After `clew setup`, `004`, `005`, and `architecture.md` exist as marked skeletons in the selected harness's governance location.
A re-run leaves each unchanged where it already exists; setup writes a stub only when absent.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)

**Related**

- Seeded through the interface defined by [ARCH-008 — The agent-facing method is emitted through a harness-adapter interface](ARCH-008-method-behind-harness-adapter.md).
- Their project-owned, never-overwritten status is governed by [CON-033 — The method scaffold is tool-owned; project files are never overwritten](CON-033-method-scaffold-tool-owned.md), which extends [CON-010 — Setup never overwrites an existing configuration](CON-010-setup-never-overwrites.md).
- Extends the scaffolding of [SW-011 — Scaffold the default configuration and layout](SW-011-scaffold-default-config.md).
