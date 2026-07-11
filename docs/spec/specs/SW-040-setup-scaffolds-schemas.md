**Title**
Setup scaffolds the default document schemas and wires them

**Lens**: SW

**Status**: planned

**Description**
Setup writes the default story and spec document-schema files into the configured schema location and sets the configuration's `schemas` section to point at them, so document validation (SW-036) is wired from the first read.
The scaffolded schemas are the fixed opinionated template (ADR-0001 D8): the pinned core every project shares (ARCH-007), which the project then extends with its own required fields and enums.
Like the rest of scaffolding, the schema files and the `schemas` wiring are written only when absent; an existing schema file or an existing `schemas` section is left as it is (CON-010).

**Rationale**
A configuration with no `schemas` section validates nothing, so a malformed story or spec is caught only later, by hand.
Scaffolding the schemas at setup gives every project the same baseline validation from the start — from a single opinionated template rather than a blank the project must discover how to fill.

**Verification Description**
After `clew setup`, the configured schema files exist and the `schemas` section points at them; a minimal valid story and a minimal valid spec pass validation, and a document missing a pinned field is rejected (SW-036).
A re-run leaves an existing schema file and an existing `schemas` section unchanged.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)

**Related**

- Extends [SW-011 — Scaffold the default configuration and layout](SW-011-scaffold-default-config.md): the scaffolded configuration now carries the document schemas.
- The written schemas are consumed by [SW-036 — Reading a document validates it against its type's schema](SW-036-scan-validates-schema.md); the pinned core they start from is [ARCH-007 — The schema core is what clew reads](ARCH-007-schema-core-is-what-clew-reads.md).
- Writes the `schemas` section of [ENT-002 — Configuration](../domain-model.md#ent-002-configuration).
