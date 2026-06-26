**Title**
The spec scan reads each spec's implementation state

**Lens**: SW

**Status**: active

**Description**
The spec scan reads each spec's `**Status**` field — `planned`, `active`, or `deprecated` — onto its scanned spec.
A spec with no `**Status**` field is `planned`.

**Rationale**
Generation filters by implementation state, so the scan that produces the scanned specs is where the state must be captured — once, alongside the id and lens.

**Verification Description**
A spec with `**Status**: active` yields a scanned spec with that state; `deprecated` yields deprecated; an absent field yields planned.

## Relations

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)

## Changes

- **2026-06-26** — Renamed the status values (`not-implemented` → `planned`, `implemented` → `active`; CON-022) and aligned the wording: the scan reads the status onto the **scanned spec**, and **generation** — not coverage — filters by it.
