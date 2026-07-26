**Title**
Setup ignores the tool's regenerated output and keeps state tracked

**Lens**: SW

**Status**: active

**Description**
Setup ensures the project's `.gitignore` excludes the tool's regenerated output — the scan locations index (`.clew/locations.json`) and the coverage report (`.clew/coverage.json`) — while keeping the state file (`.clew/state.json`) tracked (CON-001).
The entries are appended when absent; an existing `.gitignore` is otherwise left as it is, and an entry already present is not duplicated (CON-010).
If the project has no `.gitignore`, setup creates one carrying those entries.

**Rationale**
The state file is the committed source of truth (CON-001), but the locations index and coverage report are regenerated from the code and the corpus, so committing them adds churn and merge conflicts for no value.
A project that ignores `.clew/` wholesale would lose the tracked state; one that ignores nothing would commit regenerated output.
Contributing the precise entries at setup gets that split right from the start, rather than leaving each project to rediscover it.

**Verification Description**
After `clew setup`, the project's `.gitignore` excludes `.clew/locations.json` and `.clew/coverage.json` and does not exclude `.clew/state.json`.
Setup appends only the missing entries and leaves an existing `.gitignore` otherwise byte-for-byte unchanged; running it again adds nothing.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Keeps tracked the state file of [CON-001](CON-001-state-file-version-controlled.md).
- Ignores the outputs of [SW-023](SW-023-scan-command.md) and [SW-028](SW-028-emit-coverage-result.md).
- Extends the scaffolding of [SW-011](SW-011-scaffold-default-config.md); appends without overwriting, honouring [CON-010](CON-010-setup-never-overwrites.md).

## Changes

- **2026-07-10** — Set active: implementation of STR-029 began.
