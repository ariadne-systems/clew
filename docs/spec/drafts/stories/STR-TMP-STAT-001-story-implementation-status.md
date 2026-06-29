**Title**
A story declares its implementation status

**Business Value**
You cannot currently tell whether a story — a unit of work — has been implemented.
A spec's done-ness comes from coverage: code anchors its traceable and `clew coverage` shows Covered.
A story has no anchors, so it is never a traceable, never Covered, and nothing marks it done.
A declared status makes "what is built versus backlog" visible at the story level — the unit a person, and an ALM tool, actually reason about.

**Problem / Context**
The `**Status**` field exists for derived specs (`planned` / `active` / `deprecated`), where it gates traceable generation and coverage carries the built-vs-in-progress distinction.
Stories are not traceables — the scan skips non-lens prefixes — so a story gets no status today and no done-signal.
006 §4 already frames the `**Status**` field as the work-item's state, file-based now and mapped from an ALM connector later; a story *is* the work item, so a story status is that field used for its original purpose.

**Solution Approach**
- Stories carry a `**Status**` field declaring implementation state: `planned` (the default, and the meaning of an absent field) → `active` (in progress) → `done` (implemented), plus `dropped` for an abandoned story.
A story needs the two terminal states (`done`, `dropped`) a spec's status lacks, because a spec gets "done" from coverage and retires through `deprecated`, while a story has neither.
- The status is **declared and informational**: it generates no traceable and does not affect coverage — a story stays outside the traceable/coverage universe.
It is read from the story file and validated against the recognized states; an unrecognized value is rejected, as it is for a spec.
- A dedicated **`clew status`** command lists each story with its status, so you can see what is built without opening every file.
It is kept separate from `clew coverage`: coverage reports *verified* anchoring, a story's status is *declared*, and mixing them would blur the two.

**Acceptance Criteria**
- A story may declare `**Status**: planned`, `active`, `done`, or `dropped`; an absent field means `planned`.
- An unrecognized story status value is rejected with an error.
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

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](../derived-specs/SYS-005-spec-lifecycle.md)

**Realizes** (new specs)

- [CON-TMP-STAT-001 — A story's status carries explicit terminal states a spec lacks](../derived-specs/CON-TMP-STAT-001-story-status-terminal-states.md)
- [SW-TMP-STAT-001 — The tool reads each story's implementation status](../derived-specs/SW-TMP-STAT-001-read-story-status.md)
- [SW-TMP-STAT-002 — The tool exposes a `clew status` command that lists each story's status](../derived-specs/SW-TMP-STAT-002-status-command.md)

**Related**

- Parallels [CON-022 — A spec's status is one of the declared values](../derived-specs/CON-022-valid-status.md) — the same idea for a derived spec, whose value set differs (no `done`; `deprecated` instead).
- Parallels [SW-031 — The spec scan reads each spec's implementation state](../derived-specs/SW-031-scan-spec-status.md) — the reader for a spec's status; a story's is read the same way but onto the story, not a traceable.
- Defers its integrity check to [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](STR-024-clew-check-suite.md).
