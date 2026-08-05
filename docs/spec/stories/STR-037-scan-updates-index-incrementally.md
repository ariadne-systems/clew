**Title**
`clew scan` keeps the index fresh incrementally, rescanning only what changed

**Status**: done

**Business Value**
`clew scan` writes the locations index the whole tool stands on — coverage, check, and the new `anchors` reverse-lookup all read it.
Today every scan re-reads and re-discovers the entire codebase; on a large project — tens of thousands of lines — that makes the index expensive to keep fresh, so it drifts, and a stale index silently misleads every consumer.
Version control already knows exactly which files changed since the last scan; re-discovering only those and patching the index makes a fresh index cheap enough to keep current on every edit or in a pre-commit hook, at any codebase size.

**Problem / Context**
The scan is full: `clew scan` (SW-023) replaces the whole index every run, re-running each generator's discover over every source file — the spec even fixes it as "full, not incremental".
That cost is what pushes the index toward staleness, and the read side can only *report* staleness (the `anchors` command, STR-036), not cure it cheaply.
Version control tracks precisely which files changed since a recorded point, so a scan that consults it can re-discover only those and patch the index, turning an O(codebase) operation into O(changes).
The one hard requirement: the incremental result must be identical to a full scan's — an optimization that ever diverged would corrupt the foundation every consumer trusts.

**Solution Approach**
Teach `clew scan` to update the existing index in place.
It records, in the index, the version-control state and scan configuration it scanned at — its provenance — and on the next run asks version control which files changed since that state, re-discovers only those, and patches the index: replacing a changed file's anchors, dropping a deleted file's, adding a new file's, and carrying every unchanged file's entries over untouched.
It falls back to a full scan whenever it cannot go incremental safely — no prior index or provenance, no version control, or a scan configuration that changed since the last scan (which can move a file in or out of scope without the file itself changing) — and a `--full` flag forces one.
The write stays atomic (the discipline of NF-002), and the result is what a full scan would produce, byte for byte.

**Acceptance Criteria**
- After a prior scan, `clew scan` re-discovers only the files version control reports changed since that scan and patches the index for them, leaving other entries untouched.
- A modified file's anchors are replaced, a deleted file's are dropped, a new file's are added, and a rename is handled as a delete plus an add.
- The incremental result is identical to a full scan of the same code state.
- `clew scan` falls back to a full scan when there is no prior index or provenance, no version control, or the scan configuration changed since the last scan; `--full` forces a full rescan.
- The index is written atomically, and records the provenance — the version-control state and scan configuration — the next incremental scan needs.
- Tests cover modify / add / delete / rename change sets, the incremental-equals-full equivalence, and each fallback trigger.

**Out of scope**
- The read side — reporting index staleness to a consumer — is STR-036 (the `anchors` command); this story is the write side that makes a fresh index cheap. The provenance this story records is what that staleness check reads.
- Change detection without version control — incremental needs a change oracle; without one, the scan stays full (no mtime-based heuristic here).
- Column- or sub-file anchor precision — unchanged; the unit stays file-and-line (SW-022, ADR-0005 D6).
- A filesystem watcher or scan daemon — `scan` remains a command run on demand.

## Relations

**Realizes** (new specs)

- [SW-048](../specs/SW-048-scan-incremental-update.md)
- [CON-035](../specs/CON-035-incremental-scan-equals-full-scan.md)

**Related**

- Extends [SW-023](../specs/SW-023-scan-command.md), whose "full, not incremental" statement this revises.
- Builds on the core scan of [SW-022](../specs/SW-022-scan-code-into-anchor-locations.md).
- The write-side companion of [STR-036](STR-036-anchors-reverse-lookup-command.md): this keeps the index fresh cheaply, that reads it and reports staleness — both off the same recorded provenance.
- Preserves the atomic-write discipline of [NF-002](../specs/NF-002-atomic-state-write.md).
