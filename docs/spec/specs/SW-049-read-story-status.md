**Title**
The tool reads each story's implementation status

**Lens**: SW

**Status**: active

**Description**
The tool reads each story's `**Status**` field — `planned`, `active`, `done`, or `dropped`, an absent field meaning `planned` — from the configured stories location into the story's reported state.
A story is read for its status even though it is not a traceable: the scan that produces traceables skips non-lens prefixes, so this is a separate read over the stories location that yields a story state on its own rather than a scanned spec.

**Rationale**
Generation and coverage consume the traceable scan, which skips stories, so the work-item state needs its own read over the stories location — the one place a story's declared status lives.
Doing it once, in core, keeps the reading and validation in one place for any surface that reports it.

**Verification Description**
Given stories declaring `active`, `done`, and no `**Status**` field, the read yields each story's state, the absent one as `planned`.
A story whose `**Status**` is unrecognized is rejected.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)

**Related**

- Parallels [SW-031](SW-031-scan-spec-status.md) — the same read, but over the stories location and onto a story state, not onto a traceable.
- Reads the value constrained by [CON-041](CON-041-story-status-terminal-states.md).

## Changes

- **2026-07-29** — Set active: implementation of STR-040 began.
