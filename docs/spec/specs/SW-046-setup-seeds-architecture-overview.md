**Title**
Setup seeds a narrative architecture overview in the docs tree

**Lens**: SW

**Status**: active

**Description**
Setup seeds a narrative architecture overview at `docs/spec/architecture.md`, as a clearly-marked skeleton the project fills.
It is project-owned: written once, only when absent, and never overwritten once it exists (CON-010) — its content is the project's.
The overview is narrative, not normative; the enforceable architecture rules are authored as ARCH and CON specs, which the overview points to.
It lives in the docs tree, loaded on demand, not in the always-loaded agent context — so it does not duplicate the generic `002` architecture baseline of the method scaffold.

**Rationale**
A project's architecture is close to the project and belongs in its documentation, read when relevant, rather than in the agent context loaded every session.
Seeding a skeleton gives the project a home to describe its shape without the tool inventing content it cannot know, and keeping it project-owned means setup never overwrites what the project wrote.

**Verification Description**
After `clew setup`, `docs/spec/architecture.md` exists as a marked skeleton.
A re-run leaves it unchanged where it already exists; setup writes it only when absent.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Extends the scaffolding of [SW-011](SW-011-scaffold-default-config.md).
- Its project-owned, never-overwritten status follows [CON-010](CON-010-setup-never-overwrites.md).
- Complements [SW-044](SW-044-setup-seeds-project-stubs.md): the governance stubs are agent-context contracts, whereas this is the docs-tree architecture overview.

## Changes

- **2026-07-12** — Authored and set active: architecture belongs in the docs tree, not the always-loaded agent context, so setup seeds a narrative overview there rather than a governance stub.