**Title**
A document schema pins only what clew reads; the rest is project-defined

**Lens**: ARCH

**Status**: active

**Description**
A document schema's enforced contract is split by one line: clew pins only the parts it mechanically reads, and the project supplies the rest.
The pinned core is exactly what clew depends on — the id form (a configured prefix and a number), that ids are unique, the `**Status**` grammar and value set, and that `## Relations` links resolve — and clew enforces it in code, not from a project file.
Everything else — which `**Bold label**` fields a document must carry, and their enums — is project-defined in a YAML schema referenced from `.clewrc.json`, so an adopter's own authoring template is enforced without any change to clew.
clew validates the union; the core is non-negotiable, the rest is the project's.

**Rationale**
If clew pinned the whole document shape, every project adopting it would be forced onto this project's template — yet clew actually reads only a handful of parts.
Pinning exactly those and no more lets clew guarantee what it depends on while leaving the authoring template to the project, the only party that knows it.
The boundary is drawn at "what clew reads" because that is precisely the set clew cannot function without — narrower would break clew, wider would constrain the adopter for nothing.

**Verification Description**
A project changes its required fields and clew honours the change with no code change.
A project cannot relax the pinned core: an id, `**Status**`, or unresolved-relation violation is enforced whatever the project schema says.

## Relations

**Realizes**

- [SYS-015 — The system validates each artifact against its declared schema when it reads it](SYS-015-validate-artifacts-on-load.md)

**Related**

- The project-defined part is configured in ENT-002 (Configuration), a schema reference per document type.
- The pinned core is the existing in-code rules gathered under one contract: [CON-022 — A spec's status is one of the declared values](CON-022-valid-status.md) (status) and [CON-025 — A bound spec id is declared by exactly one file](CON-025-one-file-per-spec-id.md) (uniqueness); the id form and relation resolvability are likewise clew's.
