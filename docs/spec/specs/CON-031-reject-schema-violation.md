**Title**
A document that violates its schema is rejected, or warned per config

**Lens**: CON

**Status**: active

**Description**
A document that does not satisfy its schema is reported with its location.
A **pinned-core** violation — the id form, uniqueness, `**Status**`, or an unresolved `## Relations` link — always **fails**, because clew cannot function on a document that breaks it.
A **project-field** violation — a missing required field or an out-of-enum value — follows the configured severity: `fail` rejects, `warn` (the default) reports and lets the scan continue.
A silent pass of a violation is never allowed; only the *severity of a project-field* violation is configurable, never whether it is caught, and never the pinned core.

**Rationale**
A schema is only worth declaring if violating it is caught; letting a malformed document through silently is the very drift the contract exists to prevent.
Making the severity configurable — but not the catching — lets a project adopt validation incrementally (`warn` first, `fail` later) without ever silently ignoring a violation.

**Verification Description**
A conformant document is accepted; a violating one is reported with its location.
A pinned-core violation always rejects, whatever the configured severity.
A project-field violation rejects at `fail` and is reported but non-fatal at `warn`; the default for project fields is `warn`.

## Relations

**Realizes**

- [SYS-015](SYS-015-validate-artifacts-on-load.md)

**Related**

- Parallels [CON-022](CON-022-valid-status.md) — the same fail-fast rule, now one part of the schema's pinned core.
- The severity (`warn` / `fail`) is configured in ENT-002 (Configuration).
