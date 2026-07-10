**Title**
A path matching the configured patterns is excluded from the scan and the checks

**Lens**: SW

**Status**: active

**Description**
The scan and the integrity checks obtain their set of project source files from one shared, exclusion-aware walk: it takes the project root, the compiled exclusion rules, and a file-acceptance predicate, and returns the accepted files as project-root-relative paths.
A scan and a check differ only in the predicate they pass and what they do with each file — never in how the project's source is decided — so a path the walk excludes is excluded for every consumer alike.
A candidate path the walk would otherwise read is excluded when the exclusion precedence resolves to excluded for it.
An excluded path is invisible: it is not read, it is never handed to a consumer (a generator's discover, a comment scan), and it produces no anchor location.
The filter is applied **before** a consumer sees a file, so excluded code never reaches a generator's marker grammar or a comment scan (it is dropped during the walk, not after parsing).
Exclusion is decided per path, for files and directories alike; pruning a directory is the optimization for a directory match, and the per-file decision still applies to every file the walk reaches.
The descent rule is explicit, so pruning never silently defeats `unexclude`:

- a directory a **user `exclude`** matches is pruned unconditionally — the user veto is absolute, so nothing beneath it can be re-included;
- a directory a **built-in default** would exclude is pruned only when no configured `unexclude` pattern could match a path beneath it, and is otherwise descended, with the per-file precedence deciding each file inside;
- any other directory is descended.

This keeps the common case cheap — a built-in-excluded tree like `node_modules` is pruned outright when no `unexclude` reaches into it, never walked — while still honouring an `unexclude` that does reach in.

**Rationale**
Filtering at the walk, before parsing, avoids wasting work on files that would be discarded and keeps every downstream consumer — coverage, resolution, the checks — blind to excluded data, exactly as it must be for the located set to be faithful (ADR-0005 D1).
One shared walk, rather than a copy per command, means the scan and the checks cannot drift on what the project's source is, so a fix to the walk reaches every consumer at once.
Pruning a directory is the cheap path, but it must not drop a path `unexclude` re-includes, or the override would be silently defeated.

**Verification Description**
A file matching an exclusion produces no anchor location, while a non-excluded sibling in the same directory is scanned normally.
A file re-included by `unexclude` under a directory a built-in default would exclude is reached and scanned.
No excluded file is parsed — its content never reaches a consumer.
The scan and a check resolve the same source-file set for the same configuration and exclusions; a path excluded for one is excluded for the other.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)

## Changes

- **2026-06-29** — Widened from the scan alone to the scan and the integrity checks, both drawing their source-file set from one shared, exclusion-aware walk parameterized by a file-acceptance predicate.
Previously the check re-implemented its own walk and exclusion handling, which could drift from the scan's; the shared walk makes them agree by construction.
