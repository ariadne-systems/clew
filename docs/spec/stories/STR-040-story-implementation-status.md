**Title**
A story declares its implementation status

**Status**: done

**Business Value**
You cannot currently tell whether a story — a unit of work — has been implemented.
A spec's done-ness comes from coverage: code anchors its traceable and `clew coverage` shows Covered.
A story has no anchors, so it is never a traceable, never Covered, and nothing marks it done.
A declared status makes "what is built versus backlog" visible at the story level — the unit a person, and an ALM tool, actually reason about.

**Problem / Context**
The `**Status**` field exists for specs (`planned` / `active` / `deprecated`), where it gates traceable generation and coverage carries the built-vs-in-progress distinction.
Stories are not traceables — the scan skips non-lens prefixes — so a story gets no status today and no done-signal.
006 §4 already frames the `**Status**` field as the work-item's state, file-based now and mapped from an ALM connector later; a story *is* the work item, so a story status is that field used for its original purpose.

**Solution Approach**
- Stories carry a `**Status**` field declaring implementation state: `planned` (the default, and the meaning of an absent field) → `active` (in progress) → `done` (implemented), plus `dropped` for an abandoned story.
A story needs the two terminal states (`done`, `dropped`) a spec's status lacks, because a spec gets "done" from coverage and retires through `deprecated`, while a story has neither.
- The status is **declared and informational**: it generates no traceable and does not affect coverage — a story stays outside the traceable/coverage universe.
It is read from the story file and validated against the recognized states; an unrecognized value is rejected, as it is for a spec.
- The status is **set by the workflow, never by the tool** — the tool only reads, validates, and lists it.
Its transitions mirror a spec's, which `006 §4` already assigns: a story is born `planned` when drafted; the implementation step sets it `active` as the increment begins — the same moment it sets the target specs `active` — and `done` when the increment closes with its specs Covered and reviewed; a person sets `dropped` when abandoning the work.
Without an assigned writer the field sits at `planned` for every built story and misreports backlog as the truth, so the ownership is part of this story, not left implicit.
- A dedicated **`clew status`** command lists each story with its status, so you can see what is built without opening every file.
It is kept separate from `clew coverage`: coverage reports *verified* anchoring, a story's status is *declared*, and mixing them would blur the two.
- The story schema's contract is extended to cover the value set.
Like a spec's, a story's `**Status**` is enforced by the pinned core, not listed as a `story.schema.yaml` field — so the change is the schema's header contract, which moves from "`**Status**` grammar" to "grammar and value set", mirroring the spec schema.
Because setup scaffolds this schema (SW-040), the scaffolded template carries the same corrected contract, so a fresh project's story schema does not misstate what its story status enforces.

**Acceptance Criteria**
- A story may declare `**Status**: planned`, `active`, `done`, or `dropped`; an absent field means `planned`.
- An unrecognized story status value is rejected with an error.
- The `story.schema.yaml` contract declares the story status value set — its header states "grammar and value set", as the spec schema's does — and `**Status**` is not added to the schema's `fields:` block, staying pinned-core.
The schema template setup scaffolds carries the same contract, so a fresh project's story schema does not misstate what it enforces.
- `006 §4` gains a story-status ownership clause, parallel to the spec-status one — who sets `planned` / `active` / `done` / `dropped`, and at which workflow moment.
- `clew-implement` sets the carrying story `active` as the increment begins and `done` as it closes — the same transitions it already applies to the increment's specs — so a built story is marked without a manual step.
- `clew status` lists each story with its status, so a reader can tell which stories are implemented; a story with no `**Status**` lists as `planned`.
- A story's status generates no traceable and leaves coverage unchanged; `clew status` and `clew coverage` stay separate.
- Tests cover each declared value, the absent default, the rejection of an unknown value, the `clew status` listing, and that story status does not alter the traceable/coverage output.

**Out of scope**
- The integrity **check** "a story marked `done` whose realized specs are not all Covered" — the anti-drift guard.
It is **deferred** to the `clew check` suite (STR-024) as a future member: it must read a story's `Realizes` links and look up coverage, and we are not building that spec-graph step now.
The declared field declares *intent*; that later check enforces *truth* — which is why the declared field's drift risk is acceptable for now.
- **Coverage-derived** story status (computing `done` from the realized specs' coverage) — rejected; no spec-graph or relation parser.
- The **spec** status (`planned`/`active`/`deprecated`, generation filtering) is unchanged.

## Relations

**Realizes**

- [SYS-005](../specs/SYS-005-spec-lifecycle.md)

**Realizes** (new specs)

- [CON-041](../specs/CON-041-story-status-terminal-states.md)
- [SW-049](../specs/SW-049-read-story-status.md)
- [SW-050](../specs/SW-050-status-command.md)

**Related**

- Parallels [CON-022](../specs/CON-022-valid-status.md) — the same idea for a spec, whose value set differs (no `done`; `deprecated` instead).
- Parallels [SW-031](../specs/SW-031-scan-spec-status.md) — the reader for a spec's status; a story's is read the same way but onto the story, not a traceable.
- Defers its integrity check to [STR-024](STR-024-clew-check-suite.md).
- Extends the story schema scaffolded by [SW-040](../specs/SW-040-setup-scaffolds-schemas.md) — its scaffolded contract must declare the new story value set.

## Changes

- **2026-07-29** — Set active: implementation of the story began.
- **2026-07-29** — Set done: implementation completed, all specs Covered, and accepted in review.
