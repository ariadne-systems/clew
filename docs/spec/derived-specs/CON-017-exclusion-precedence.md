**Title**
Scan exclusion precedence — a user `exclude` is absolute, `unexclude` overrides only the defaults

**Lens**: CON

**Status**: active

**Description**
For each candidate path the scan visits, the exclusion decision is evaluated in this fixed order:

1. the path matches a user `exclude` pattern → excluded;
2. otherwise the path matches an `unexclude` pattern → included;
3. otherwise the path matches a built-in default (CON-016) → excluded;
4. otherwise → included.

A user `exclude` therefore always wins: `unexclude` re-includes only what a built-in default would have dropped, and can never override a user `exclude`.
Absence of `unexclude` leaves the built-in defaults in force unchanged.

**Rationale**
The order is gitignore's `!pattern` semantics, named `exclude` / `unexclude` to match that convention.
A project's explicit exclusion is its own intent and must always hold, so it sits above `unexclude`; `unexclude` exists only as a tool against the tool-baked defaults, which cannot anticipate every project's layout.
Ranking user `exclude` above `unexclude` keeps the two project-level controls unambiguous.

**Verification Description**
A path matching only a user `exclude` is excluded; a path matching only `unexclude` is included even when a built-in default would exclude it.
A path matching **both** a user `exclude` and an `unexclude` is excluded — the user veto wins.
A path matching only a built-in default is excluded; a path matching nothing is scanned.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
