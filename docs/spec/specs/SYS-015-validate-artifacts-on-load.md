**Title**
The system validates each artifact against its declared schema when it reads it

**Lens**: SYS

**Status**: active

**Description**
The system shall validate each spec and story against the schema declared for its document type at the moment it reads the artifact, so a structurally malformed document is caught on load rather than relied upon downstream.
The enforced contract is the union of a pinned core the system always applies and a project-supplied part; each violation is reported located, at a configurable severity.

**Rationale**
A corpus is only trustworthy if every document conforms to a known contract.
Catching a violation when the document is read — not when something downstream breaks — keeps the failure close to its cause and the corpus dependable for generation, coverage, and export.

**Verification Description**
Reading a conformant document succeeds; reading one that violates its schema is reported — and, at fail severity, rejected — with the document's location.
A project supplies its own document schema, and the system honours it without modification.

## Relations

**Realizes**

- [STK-002](STK-002-audit-evidence.md)
