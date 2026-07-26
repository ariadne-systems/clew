**Title**
`clew scan` updates the index incrementally, rescanning only changed files

**Lens**: SW

**Status**: active

**Description**
`clew scan` updates the existing locations index in place rather than always rebuilding it.
It records, in the index, the version-control state and scan configuration it scanned at, and on the next run asks version control which files changed since that state and re-discovers only those — patching the index by replacing a changed file's anchors, dropping a deleted file's, and adding a new file's, while every unchanged file's entries are carried over untouched.
It falls back to a full scan when it cannot go incremental safely: no prior index or recorded provenance, no version control available, or a scan configuration — the exclusions or generators — that changed since the last scan, since that can move a file in or out of scope without the file changing.
It assumes clew's scanned files sit within version control's view: a source file clew scans but version control **ignores** is absent from the change set, so a project that anchors a git-ignored file must run `--full` to update it.
A `--full` flag forces a full rescan.
The index is written atomically (the discipline of NF-002), replacing it as one file, and it records the provenance the next incremental scan needs.

**Rationale**
The index is the foundation coverage, check, and the reverse-lookup read; a full rescan on every change is what makes keeping it fresh expensive, so it drifts.
Version control already knows the changed set, so re-discovering only those files turns the scan from O(codebase) into O(changes) — cheap enough to run on every edit — while the fallbacks keep it correct wherever the changed set cannot be trusted.
Recording provenance in the index is what lets the next scan compute the change set at all, and the same stamp lets a reader judge the index's freshness.

**Verification Description**
Given a prior index, `clew scan` re-discovers only the files version control reports changed since it was written and patches the index for them, carrying unchanged entries over; a modified file's anchors are replaced, a deleted file's dropped, a new file's added.
With no prior index or provenance, no version control, or a changed scan configuration, it performs a full scan; `--full` forces one.
The index is written atomically and records the provenance — the version-control state and scan configuration — the next incremental scan needs.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002](SYS-002-reverse-traceability-coverage.md)

**Related**

- Extends [SW-023](SW-023-scan-command.md), revising its "full, not incremental" clause, and builds on the core scan of [SW-022](SW-022-scan-code-into-anchor-locations.md).
- Constrained by [CON-035](CON-035-incremental-scan-equals-full-scan.md).
- Preserves the atomic-write discipline of [NF-002](NF-002-atomic-state-write.md).

## Changes

- **2026-07-27** — Set active: implementation of STR-037 began.
- **2026-07-27** — Recorded that provenance also carries the tracked files dirty at scan time (rescanned next run so a reverted edit is not carried over stale), and scoped the guarantee to files version control sees — a git-ignored source file clew scans needs `--full`.
Both surfaced in review of the first implementation.
