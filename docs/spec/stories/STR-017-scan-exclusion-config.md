**Title**
Add configurable scan exclusion — `exclude` and `unexclude` in `.clewrc.json`

**Business Value**
The scan finds anchors in *all* the project's source, but not every part of a codebase carries real traceability intent.
A project's own test infrastructure or fixtures can contain marker-shaped code that should not count, and a project's source layout can collide with a built-in exclusion (the classic `adapter/out` vs the `out` build directory).
Letting a project declare what to exclude — and what to re-include — keeps the located set, and therefore coverage, faithful to what the project actually means to trace.
These keys are also the shared `.clewrc.json` configuration contract (ADR-0005 D6), so a project's exclusion config is portable across the tools that read it.

**Problem / Context**
STR-016 gave the scan a fixed set of **built-in** exclusions (CON-016): dependency, build, and generator-output directories, matched by directory name.
Two gaps remain.
A project cannot exclude anything of its own (a test tree, generated fixtures) and cannot re-include a path the built-ins drop.
And name-based matching is too blunt: a built-in like `out` silently drops a source directory named `out` wherever it appears — the failure that root-relative globs prevent.

**Solution Approach**
Read two arrays from `.clewrc.json` — `exclude` and `unexclude` — each a list of **repository-root-relative globs**, and apply them in the scan alongside the built-in defaults.
Glob semantics are explicit: paths are matched relative to the project root with forward slashes, a bare segment matches only at the root (`out` is `<root>/out`, not `<root>/foo/out`), and a `**/` prefix matches at any depth (`**/node_modules`).
The built-in defaults from CON-016 are re-expressed as such globs, so they stop over-matching by name.
Precedence is gitignore-style: for each candidate path, a user `exclude` match wins (the path is skipped); otherwise an `unexclude` match re-includes it (overriding a built-in default); otherwise a built-in default match skips it; otherwise it is scanned.
A user `exclude` is absolute — `unexclude` overrides only the built-in defaults, never a user `exclude`.
An excluded path is invisible to the scan: it is not read, it produces no anchor location, and it is never parsed (the filter is applied before discovery).
An omitted `exclude` / `unexclude` section means no configured exclusions (backward-compatible with STR-016); the scan already requires a configuration to run (CON-011), so this is a config that simply leaves the section out, not a missing file.
An invalid glob fails the scan fast, with a stable error naming the pattern: silently ignoring a bad exclusion would let files meant to be excluded leak into the scan and fabricate coverage, so it is an error, not a warning — clew's fail-fast stance (developer guidelines §2), suited to a local, version-controlled config.

**Affected specs and artifacts** (planned; ids bound on promotion)
- SW — the scan reads `exclude` / `unexclude` from configuration and fails fast on a pattern that cannot be compiled (sibling to SW-009).
- SW — the scan excludes a matching path: it is not read and produces no anchor, the filter applied before discovery.
- CON — exclusion precedence: user `exclude` > `unexclude` > built-in default > include; a user `exclude` is absolute.
- CON — glob semantics: repository-root-relative, forward-slash normalized, bare segment = root-only, `**/` = any depth; the built-in defaults (CON-016) are expressed as such globs.
- ENT-002 (Configuration) gains `exclude` and `unexclude` attributes.

**Acceptance Criteria**
- A path matching a user `exclude` glob is not scanned and produces no anchor location.
- A path matching `unexclude` is scanned even when a built-in default would exclude it; a path matching both a user `exclude` and `unexclude` is **not** scanned (user `exclude` wins).
- A bare-segment default matches only at the root; a `**/`-prefixed pattern matches at any depth — a source file under `…/adapter/out/…` is scanned, while `<root>/out` is excluded.
- Patterns are matched on forward-slash, root-relative paths, so they behave identically on Windows and POSIX.
- With neither array present in the configuration, the scan behaves exactly as STR-016 (built-in defaults only).
- An invalid glob in `exclude` or `unexclude` fails the scan with a stable error that names the offending pattern.
- Vitest covers: a user exclusion; an unexclude overriding a default; user-exclude-beats-unexclude; root-only vs `**/` depth (the `adapter/out` case); platform-normalized matching; an omitted section; and an invalid pattern failing the scan fast.

**Decisions** (resolved by ADR-0005)
- The config keys are `exclude` / `unexclude`, the shared `.clewrc.json` configuration contract (ADR-0005 D6).
- Precedence is gitignore-style with the user `exclude` absolute, so a project's explicit veto always wins and `unexclude` is only a tool against the built-in defaults.
- Defaults become root-relative globs, fixing the name-collision blunt-matching of CON-016.
- Exclusion is applied **before** discovery, so excluded code never reaches a generator's scan.
- An invalid glob fails the scan fast (an error), rather than a tolerant warn-and-skip: clew runs locally against version-controlled config, and a silently-skipped `exclude` would fabricate coverage — so clew's fail-fast developer-guideline stance applies.

**Out of scope**
- Coverage, the waiver list, and enforcement (later stories; ADR-0005 D4/D5) — exclusion only shapes which anchors exist, not what coverage requires.
- Per-generator or per-language exclusion — exclusion is language-neutral, decided in the core before files reach a generator.
- Other `.clewrc.json` sections beyond the scan's exclusion config — not part of clew's scan.
- A `.gitignore`-style ignore *file*; exclusions live in `.clewrc.json`, the one config (ADR-0005 D6).

## Relations

**Realizes**

- [SW-025](../specs/SW-025-read-exclusion-patterns.md)
- [SW-024](../specs/SW-024-exclude-matching-paths.md)
- [CON-017](../specs/CON-017-exclusion-precedence.md)
- [CON-018](../specs/CON-018-root-relative-globs.md)

**Related (existing corpus)**

- Refines [CON-016](../specs/CON-016-scan-builtin-exclusions.md): the built-in defaults become root-relative globs and the lowest precedence layer, which `unexclude` can override.
- Extends [SW-022](../specs/SW-022-scan-code-into-anchor-locations.md): the core walk gains the exclusion filter, applied before discovery.
- Sibling of [SW-009](../specs/SW-009-read-configuration.md): `exclude` / `unexclude` are read from the same `.clewrc.json`.
- [ENT-002](../domain-model.md#ent-002-configuration) gains `exclude` and `unexclude` attributes (merged on promotion).
- Builds on [STR-016](STR-016-anchor-scan.md), whose built-in exclusions (CON-016) this story makes configurable.

## Changes

- **2026-06-29** — Updated the link text for CON-016 and SW-024 to their revised titles (STR-024).
Reference-only; this story's meaning is unchanged.
