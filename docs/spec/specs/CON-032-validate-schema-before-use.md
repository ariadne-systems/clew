**Title**
A schema is validated against clew's minimum contract before it is used

**Lens**: CON

**Status**: active

**Description**
Before clew applies a project schema, it validates the schema itself against clew's minimum contract.
The schema must be well-formed — a recognized shape (`fields` as label → `{ required, enum }`, an `onError` of `warn` or `fail`) — and it may not redefine the id form, which is clew's; a `**Status**` `enum`, if present, must match clew's value set for that document type, so a schema may restate the set for completeness but a divergent one — a missing, extra, or renamed value — is rejected.
A schema that fails the contract is rejected with its location, before any document is validated against it.
clew defines the contract; whatever clew requires of a schema must hold, or the schema is not used.

**Rationale**
A malformed or overreaching schema would otherwise fail silently or mid-scan — a typo'd key ignored, or a project believing it controls the id form or status values when it does not — and documents would then be validated against a contract that does not mean what the author thought.
Checking the schema once, up front, against clew's own requirements keeps the failure at the schema, close to the mistake, rather than surfacing as confusing per-document errors later.
It is also where the pinned-core boundary is actually enforced: a schema cannot relax what clew owns because clew refuses such a schema outright.

**Verification Description**
A schema with an unrecognized shape, an invalid `onError`, or an attempt to redefine the id form is rejected, naming the schema.
A `**Status**` enum that matches the document type's value set is accepted; one that diverges — a missing, extra, or renamed value — is rejected, naming the schema.
A schema meeting the contract is accepted and applied.
The schema is checked before any document is validated against it.

## Relations

**Realizes**

- [SYS-015](SYS-015-validate-artifacts-on-load.md)

**Related**

- Enforces [ARCH-007](ARCH-007-schema-core-is-what-clew-reads.md) — this is where "a project cannot relax the pinned core" is actually checked, at the schema.
- Mirrors [CON-031](CON-031-reject-schema-violation.md) at the meta level — that rejects a document against its schema; this rejects a schema against clew's contract.
- Content, not provenance: [CON-040](CON-040-schema-path-within-root.md) bounds *where* a schema loads from; this validates *what* it contains — together, a schema is safe to use.

## Changes

- **2026-07-26** — Added the relation to CON-040 (schema-path containment).
This does not change what this spec requires — a `clew-critique` pass noted that "before it is used" here covers the schema's *shape* but not its *path*, so the provenance half is named explicitly as CON-040's concern rather than left implicit.

- **2026-07-31** — A schema may now restate the `**Status**` value set: a `Status` enum that matches the document type's set is accepted, where before any `Status` enum was rejected (STR-041).
The value set stays clew's — a divergent enum is still refused — but allowing a matching one lets a scaffolded schema surface the set and be complete, rather than hide a field it enforces.
