**Title**
A schema is validated against clew's minimum contract before it is used

**Lens**: CON

**Status**: active

**Description**
Before clew applies a project schema, it validates the schema itself against clew's minimum contract.
The schema must be well-formed — a recognized shape (`fields` as label → `{ required, enum }`, an `onError` of `warn` or `fail`) — and it must not reach into the pinned core: it may not redefine the id form or the `**Status**` value set, which are clew's.
A schema that fails the contract is rejected with its location, before any document is validated against it.
clew defines the contract; whatever clew requires of a schema must hold, or the schema is not used.

**Rationale**
A malformed or overreaching schema would otherwise fail silently or mid-scan — a typo'd key ignored, or a project believing it controls the id form or status values when it does not — and documents would then be validated against a contract that does not mean what the author thought.
Checking the schema once, up front, against clew's own requirements keeps the failure at the schema, close to the mistake, rather than surfacing as confusing per-document errors later.
It is also where the pinned-core boundary is actually enforced: a schema cannot relax what clew owns because clew refuses such a schema outright.

**Verification Description**
A schema with an unrecognized shape, an invalid `onError`, or an attempt to redefine the pinned core (the id form or the status values) is rejected, naming the schema.
A schema meeting the contract is accepted and applied.
The schema is checked before any document is validated against it.

## Relations

**Realizes**

- [SYS-015 — The system validates each artifact against its declared schema when it reads it](SYS-015-validate-artifacts-on-load.md)

**Related**

- Enforces [ARCH-007 — A document schema pins only what clew reads; the rest is project-defined](ARCH-007-schema-core-is-what-clew-reads.md) — this is where "a project cannot relax the pinned core" is actually checked, at the schema.
- Mirrors [CON-031 — A document that violates its schema is rejected, or warned per config](CON-031-reject-schema-violation.md) at the meta level — that rejects a document against its schema; this rejects a schema against clew's contract.
- Content, not provenance: [CON-040 — A configured schema path may not escape the project root](CON-040-schema-path-within-root.md) bounds *where* a schema loads from; this validates *what* it contains — together, a schema is safe to use.

## Changes

- **2026-07-26** — Added the relation to CON-040 (schema-path containment).
This does not change what this spec requires — a `clew-critique` pass noted that "before it is used" here covers the schema's *shape* but not its *path*, so the provenance half is named explicitly as CON-040's concern rather than left implicit.
