**Title**
The scan excludes dependency, build-output, and version-control directories by default

**Lens**: CON

**Status**: active

**Description**
The code scan skips dependency, build-output, and version-control directories by default — for example `node_modules`, Maven's `target` and Gradle's `build`, and `.git` / `.svn` / `.hg` — because they are not the project's source.
The set covers the languages clew generates for, and the concern is the same in each case: a dependency or build-output directory can hold source that is not the project's own — a `node_modules` package, a `target/generated-sources/*.java` — which the scan would otherwise read and count, and `.svn` keeps pristine copies of the project's own source.
It does not enumerate metadata directories that carry no scannable source (an IDE or OS folder): the scan looks only in files a generator recognizes, so such a folder yields no anchor and need not be a built-in default; a project may still list one under `scan.exclude`.
It does **not** automatically exclude a generator's output directory: generated output is inert to the scan (CON-030), so it need not be hidden to keep the located set faithful, and a project that wants it skipped lists it under `scan.exclude` like any other path.
STR-017 adds the configurable `exclude` / `unexclude` layer on top: there the built-in defaults become root-relative globs (CON-018) and the lowest precedence layer, which a user `exclude` or an `unexclude` can override (CON-017); the built-ins are the base of that precedence, not an immovable floor (ADR-0005 D6).

**Rationale**
Dependency, build-output, and version-control directories are not the project's source and would add noise and cost — and, where they hold foreign or copied source, false coverage — so the scan skips them out of the box, before any configuration, keeping the located set faithful to what the project's own code anchors.
A generator's output is no longer excluded by default because it does not need to be: generated output carries spec ids only as symbol names and string values, and any anchor-shaped example only inside a comment, so discovery — which masks comments and strings and derives a reference's id from the member name (SW-021) — finds no anchor there (CON-030).
Relying on that inertness rather than a remembered exclusion removes a correctness trap: a defaulted or relocated output directory can no longer fabricate anchors or false violations merely because the scan forgot to hide it.

**Verification Description**
A marker placed under a built-in-excluded location — `node_modules`, a build output (`target`, `build`), or a version-control directory (`.git`, `.svn`, `.hg`) — produces no anchor location, at the root or nested (a per-module `service/target`).
A marker in the project's own source outside those locations is reported normally.
The built-in exclusions apply with no configuration present, and a generator's output directory is scanned unless the project lists it under `scan.exclude`.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Related**

- Relies on [CON-030 — Generated output is inert to the scan and the checks](CON-030-generated-output-inert-to-scan.md): inertness, not a built-in exclusion, is what keeps the scan faithful to generated output.

## Changes

- **2026-06-29** — Dropped the automatic exclusion of generator output directories.
Generated output is now inert to the scan (CON-030), so excluding it is a project choice (`exclude`), not a built-in correctness requirement.
The prior rationale — that scanning the output directory "would invent anchors that no one wrote" — no longer held: discovery masks comments and strings and derives ids from member names, so it finds no anchor in generated output wherever it sits.
- **2026-07-17** — A project now lists a path it wants skipped under `scan.exclude` rather than under a root-level `exclude` (STR-033).
Where the patterns are configured moved; the built-in defaults and their place at the base of the precedence are unchanged.
- **2026-07-17** — Added Maven's `**/target` and the `**/.svn` / `**/.hg` version-control directories to the built-in defaults.
`target` was the gap that `**/build` (Gradle) already covered for the other Java build tool, and it holds `generated-sources/*.java` the scan would otherwise read; `.svn` keeps pristine copies of the project's own source, so scanning it would double-count real anchors.
The title broadened to name version control alongside dependency and build. The set stays deliberately narrow — no IDE, OS, or other-ecosystem folders — because those carry no scannable source and excluding them would change no anchor (CON-030).
