**Title**
The scan validates each document against its schema

**Lens**: SW

**Status**: active

**Description**
When the scan reads a spec or story, it validates the document against its type's schema — the pinned core (the id form, uniqueness, the `**Status**` grammar and value set, and that `## Relations` links resolve) merged with the project's required fields and enums from the YAML schema referenced in `.ariadnerc.json`.
A `**Bold label**` field is matched against the schema case-insensitively.
The schema-declared fields that are present must appear in the schema's declared order; a field the schema does not declare is ignored and may appear anywhere between them.
A violation is collected with the document's location: a pinned-core violation always fails the scan; a project-field violation follows the configured severity — `fail` rejects, `warn` reports and continues.
With no project schema configured, only the pinned core is enforced.

**Rationale**
The scan is already where each document is read and its status validated, so it is the one place that sees every document on load.
Validating the whole schema there catches a malformed document at the moment of reading — once, for every consumer downstream.

**Verification Description**
A conformant document scans.
A document missing a project-required field, or carrying a value outside a field's enum, is reported with its location; a pinned-core violation (id, uniqueness, `**Status**`, unresolved relation link) always fails.
A document whose schema-declared fields appear out of the declared order is reported, while a field the schema does not declare may appear anywhere between them.
For a project-field violation, `warn` continues the scan and `fail` stops it.
A field label differing only in case still matches.
With no project schema configured, a document carrying arbitrary fields scans as long as the pinned core holds.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-015 — The system validates each artifact against its declared schema when it reads it](SYS-015-validate-artifacts-on-load.md)

**Related**

- Implements [ARCH-007 — A document schema pins only what clew reads; the rest is project-defined](ARCH-007-schema-core-is-what-clew-reads.md) — the pinned-core/project split this scan enforces.
- Generalizes [SW-031 — The spec scan reads each spec's implementation state](SW-031-scan-spec-status.md) — reading and checking the status becomes one part of validating the schema.
- Holds [CON-031 — A document that violates its schema is rejected, or warned per config](CON-031-reject-schema-violation.md).
- Applies a schema only after it passes [CON-032 — A schema is validated against clew's minimum contract before it is used](CON-032-validate-schema-before-use.md).

## Changes

- **2026-07-01** — Extended the schema check to enforce field order: the schema-declared fields present in a document must appear in the schema's declared order, while fields the schema does not declare are ignored and may sit anywhere between them.
Field order is part of "the document conforms to its schema", and was previously unchecked.
