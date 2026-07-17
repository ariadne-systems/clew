**Title**
Read the scan's `exclude` and `unexclude` patterns from configuration

**Lens**: SW

**Status**: active

**Description**
The scan reads two arrays from `.clewrc.json` (ENT-002): `scan.exclude` and `scan.unexclude`, each a list of glob patterns.
An omitted array — a configuration that leaves out the `scan` section, or either array within it — yields an empty list for it, no configured exclusions, so a project that sets neither behaves exactly as before (SW-022); the scan already requires a configuration to run (CON-011), so this is an omitted section, not a missing file.
An entry that is not a valid glob fails the scan fast, with a stable error that names the offending pattern and the array it came from.
A pattern is *invalid* when it cannot be compiled into a matcher — for example an unterminated character class `[` or a malformed `{…}` group; a well-formed pattern that simply matches nothing is a valid no-op, not invalid.
Validity is checked by compiling every pattern up front, before the walk: a matcher library that silently degrades a malformed pattern to one that never matches is not acceptable on its own, because that is exactly how an excluded path would leak back into the scan and fabricate coverage — the invalid pattern must be detected and surfaced.
This is the reading half; how the patterns are matched and combined is the precedence and glob-semantics constraints, and where they apply is the scan itself.

**Rationale**
A convention file in the repository root is the established pattern for project configuration, and reading the patterns from `.clewrc.json` keeps them version-controlled with the code, alongside every other setting the project states (ENT-002).
An invalid pattern fails the scan rather than being skipped: a silently-ignored `exclude` would let files meant to be excluded leak in and produce false coverage — the very miscompile the tool exists to prevent — and because the config is version-controlled, failing fast surfaces the typo at the moment it is introduced (developer guidelines §2).
This is a deliberate fail-fast choice for a local tool, rather than tolerating a bad pattern and continuing.

**Verification Description**
Given `scan.exclude` and `scan.unexclude` arrays, both are read as their lists of patterns.
A configuration that omits the `scan` section, or both arrays within it, yields empty lists.
An uncompilable pattern in either array — for example an unterminated `[` — fails the scan with a stable error that names the pattern, and no anchors are written from the aborted run; a well-formed pattern that happens to match nothing is accepted as a valid no-op.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)

## Changes

- **2026-07-17** — The patterns are read from `scan.exclude` / `scan.unexclude` rather than from the configuration root (STR-033).
At the root the keys named no object; they now sit under the machine they shape. What is read, and the fail-fast on an uncompilable pattern, are unchanged.
- **2026-07-17** — Dropped the shared-configuration-contract justification: ADR-0005 D6 no longer treats `.clewrc.json` as a contract shared with other tools (STR-033), so the rationale now rests on what still holds — the patterns stay version-controlled with the code.
