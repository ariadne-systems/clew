<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# Spec Conventions

These conventions govern how specs in the spec tree are authored and maintained.
They carry the same authority as `003-developer-guidelines.md` (per `000`, additional contract files 004+).

---

## 1. Change Tracking

Every change to a **spec** already promoted into the spec tree must be recorded in a `## Changes` section at the end of that spec.

Each entry states **when** the change was made and **why**.
Record the date as an absolute ISO date (`YYYY-MM-DD`), not a relative one.
State the reason, not only the mechanics: a reader must understand the motivation, not just the diff.
When the edit does not alter the spec's meaning (for example a rename of a referenced name), say so explicitly.

The section is append-only.
Add a new entry for each change; never rewrite or remove an earlier entry.
This mirrors the traceability the corpus exists to preserve (`001-charta.md`, II): the history of intent is part of the record.

Drafts — specs still in the drafts location, not yet promoted — do not carry a `## Changes` section.
Their recorded history begins at promotion; edits before that are part of authoring, not change.

A **story** carries no `## Changes` section: its only change in the corpus is its `**Status**` transition (`planned` → `active` → `done`), which the `**Status**` field records and git dates — there is no evolving decision text to track, as there is for a spec.

### Format

```
## Changes

- **2026-01-15** — Rewrote the verification description to cover the absent-section case.
The original wording missed the partial-configuration path the implementation now takes.
```

---

## 2. A title states the decision

A spec's title states the decision or constraint the spec pins, concretely — not a capability noun.
Its **filename slug** is that title tightened to a kebab, and is what becomes the generated traceable's name (`CON-021-missing-realize-never-waivable.md` → `CON_021_MISSING_REALIZE_NEVER_WAIVABLE`) — the symbol code anchors to and a reader meets at the anchor. Title and slug must tell the same story, and both must carry the decision: `MISSING_REALIZE_NEVER_WAIVABLE`, not `coverage`.
A title or slug that merely restates the component it governs, or a generic umbrella that fits many specs equally, is a defect to fix, not a matter of style.

---

## 3. Scope

This convention is about the spec corpus only.
It does not change how code is anchored to specs (the trace markers) or how ids are minted.

---

## 4. Implementation status

A spec promoted into the corpus may declare a `**Status**` field — its implementation state — as a field at the top, beside `**Lens**`:

- `planned` (the default when the field is absent) — authored and approved, but not yet built.
It generates **no** traceable, so it is outside the coverage universe (CON-020) and cannot be anchored.
- `active` — being built, or in service.
It generates a traceable; coverage then shows whether code actually anchors it — an open gap until it does, Covered once it does.
- `deprecated` — retiring.
Its traceable is still generated but **marked** deprecated, so existing anchors keep building, and coverage lists it without counting it; do not add a new `realizes` or `verifies` anchor to a `deprecated` spec.

Set a spec `active` when work on it **begins** — that is what generates its traceable, so the code can anchor against it as it is written, not after the code is done.
Set it `deprecated` when the spec is retiring.
Because the status filters generation (SW-014), it is how a spec-first project keeps its unbuilt backlog out of coverage without waiving every spec.

The `**Status**` field is the file-based source of the state; a future ALM connector maps it from the work item's state instead.
An unrecognized value is rejected (CON-022).

A story carries the same `**Status**` field, used for its original purpose — the work item's own state.
Its value set differs (CON-041): `planned` → `active` → `done`, plus `dropped` for abandoned work, because a story is never a traceable and so has neither coverage to signal done nor `deprecated` to retire.
A story's status is informational: it generates no traceable, does not affect coverage, and its transitions are recorded by the `**Status**` field and git, not a `## Changes` section (§1).
It is set by the workflow, never by the tool: a story is born `planned` when drafted; the implementation step sets it `active` when the increment begins — the same moment it sets the target specs `active` — and `done` when the increment closes with its specs Covered and reviewed; a person sets `dropped` when abandoning the work.
An unrecognized value is rejected (CON-041), and `clew status` lists each story's state.
