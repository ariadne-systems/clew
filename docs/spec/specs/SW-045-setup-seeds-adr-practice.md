**Title**
Setup seeds the ADR practice with a tool-owned template

**Lens**: SW

**Status**: active

**Description**
Setup seeds the architecture-decision-record practice: it creates the `docs/adr/` location and emits a tool-owned ADR template there, giving an author the ADR shape the method's ARCH specs reference (context, decision, consequences).
The template is harness-neutral and written to a fixed location — it is not materialized per harness like the governance baselines and skills (SW-043) — and it is tool-owned and re-emittable (CON-033).
The individual ADRs a project writes are project content and are never overwritten.

**Rationale**
The governance method records structural decisions as ADRs, and the ARCH specs reference them; a scaffolded project that does not know the ADR shape or where ADRs live cannot follow that practice without copying it by hand.
The template is generic method — the tool's to keep current — while the ADRs written from it are the project's, so the template is tool-owned and the ADRs are not (ADR-0008 D5).

**Verification Description**
After `clew setup`, `docs/adr/` exists and contains a tool-owned ADR template carrying the tool-owned marker.
Re-running setup re-emits the template but never overwrites a project's own ADR.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- The harness-neutral counterpart to the per-harness emission of [SW-043](SW-043-setup-emits-method-scaffold.md); both are method the tool ships.
- Tool-owned and re-emittable, project ADRs untouched, per [CON-033](CON-033-method-scaffold-tool-owned.md).
- Extends the scaffolding of [SW-011](SW-011-scaffold-default-config.md).

## Changes

- **2026-07-12** — Set active: implementation of STR-031 began.
