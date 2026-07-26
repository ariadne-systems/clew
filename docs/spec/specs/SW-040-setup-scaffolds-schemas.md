**Title**
Setup scaffolds the default document schemas and wires them

**Lens**: SW

**Status**: active

**Description**
Setup writes the default story and spec document-schema files into the configured schema location and sets the configuration's `schemas` section to point at them, so document validation (SW-036) is wired from the first read.
Beside each schema it also writes a copyable **example** — a minimal, valid story and spec in the field format clew reads — so a fresh project, which has no existing story or spec to copy, follows the form rather than guessing it; the examples live beside the schemas, outside the story and spec directories, so clew never treats them as corpus documents.
The scaffolded schemas are the fixed opinionated template (ADR-0001 D8): the pinned core every project shares (ARCH-007), which the project then extends with its own required fields and enums.
Like the rest of scaffolding, the schema files, the examples, and the `schemas` wiring are written only when absent; an existing file or an existing `schemas` section is left as it is (CON-010).

**Rationale**
A configuration with no `schemas` section validates nothing, so a malformed story or spec is caught only later, by hand.
Scaffolding the schemas at setup gives every project the same baseline validation from the start — from a single opinionated template rather than a blank the project must discover how to fill.

**Verification Description**
After `clew setup`, the configured schema files exist and the `schemas` section points at them; a minimal valid story and a minimal valid spec pass validation, and a document missing a pinned field is rejected (SW-036).
A copyable example exists beside each schema, and each example validates against its own scaffolded schema with no violations.
A re-run leaves an existing schema file, an existing example, and an existing `schemas` section unchanged.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)

**Related**

- Extends [SW-011 — Scaffold the default configuration and layout](SW-011-scaffold-default-config.md): the scaffolded configuration now carries the document schemas.
- The written schemas are consumed by [SW-036 — Reading a document validates it against its type's schema](SW-036-scan-validates-schema.md); the pinned core they start from is [ARCH-007 — The schema core is what clew reads](ARCH-007-schema-core-is-what-clew-reads.md).
- Writes the `schemas` section of [ENT-002 — Configuration](../domain-model.md#ent-002-configuration).

## Changes

- **2026-07-10** — Set active: implementation of STR-029 began.
- **2026-07-22** — Broadened scaffolding to also write a copyable valid example beside each schema (`story.example.md`, `spec.example.md`).
A fresh project has no existing story or spec to copy the field format from, and the schema lists field names without showing that clew detects a field only as a `**Bold label**` — so an agent authoring the first story guessed the form (a heading instead of a `**Title**` field), producing a story that fails validation on promotion.
The example gives every project a copyable, schema-valid form from the start; a golden test keeps each example valid against its own schema.
The title and slug are unchanged — the examples are part of scaffolding the schemas, not a separate decision — so no anchor churns.
