# Spec Conventions

These conventions govern how specs in the spec tree are authored and maintained.
They carry the same authority as `003-developer-guidelines.md` (per `000`, additional contract files 004+).

---

## 1. Change Tracking

Every change to a spec already in the corpus — a story or a derived spec that has been promoted into the spec tree — must be recorded in a `## Changes` section at the end of that spec.

Each entry states **when** the change was made and **why**.
Record the date as an absolute ISO date (`YYYY-MM-DD`), not a relative one.
State the reason, not only the mechanics: a reader must understand the motivation, not just the diff.
When the edit does not alter the spec's meaning (for example a rename of a referenced name), say so explicitly.

The section is append-only.
Add a new entry for each change; never rewrite or remove an earlier entry.
This mirrors the traceability the corpus exists to preserve (`001-charta.md`, II): the history of intent is part of the record.

Drafts — specs still in the drafts location, not yet promoted — do not carry a `## Changes` section.
Their recorded history begins at promotion; edits before that are part of authoring, not change.

### Format

```
## Changes

- **2026-01-15** — Rewrote the verification description to cover the absent-section case.
The original wording missed the partial-configuration path the implementation now takes.
```

---

## 2. Scope

This convention is about the spec corpus only.
It does not change how code is anchored to specs (the trace markers) or how ids are minted.
