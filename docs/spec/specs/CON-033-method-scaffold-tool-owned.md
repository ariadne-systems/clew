**Title**
The method scaffold is tool-owned and re-emittable; project files are never overwritten

**Lens**: CON

**Status**: planned

**Description**
The emitted method scaffold — the governance baselines and the clew skills — is tool-owned: marked as generated, re-emitted whole on each setup run, and never hand-edited, exactly as the generated traceables are (CON-012).
A project-owned file is never overwritten by setup: the configuration (CON-010), a seeded project stub once it exists, and any spec are left byte-for-byte as the project has them.
Re-running setup therefore refreshes the tool-owned method to the tool's current version and touches nothing the project owns, so a re-run is always safe.

**Rationale**
The method is a projection of the tool's current governance and skills, so the tool must be free to re-emit it; a hand edit that diverges would drift the project's method from the tool's.
The project's own content — its configuration, its filled stubs, its specs — is the project's alone, so setup must be able to refresh the one without ever destroying the other (ADR-0008 D4).

**Verification Description**
Re-running setup replaces the tool-owned method files and reverts any hand edit to them.
Re-running setup leaves the configuration, every existing project stub, and every spec byte-for-byte unchanged.
A method file carries the tool-owned marker; a project stub and the configuration do not.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Related**

- The same tool-owned rule as [CON-012 — Generated traceables and utilities are tool-owned and never hand-edited](CON-012-generated-files-tool-owned.md), applied to the method scaffold rather than the traceables.
- Extends [CON-010 — Setup never overwrites an existing configuration](CON-010-setup-never-overwrites.md) from the configuration to every project-owned file setup can touch.
