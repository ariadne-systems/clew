---
"@ariadne-thread/core": minor
"@ariadne-thread/cli": minor
---

Add the `clew coverage` command and core coverage computation (STR-018) — the reverse-completeness report (ADR-0005).

Coverage compares the code anchors (the scan) against the spec traceables and classifies each spec by whether code realizes it and a test verifies it: Covered (both), Realized, Verified, or None; `concerns` never counts (CON-019), and the universe is exactly the traceables the spec command produces, of any lens (CON-020).
A committed `waivers` list (`{ id, reason }` on `.ariadnerc.json`, ENT-002) accepts a not-Covered spec, reporting it waived rather than an open gap; a waiver for a Covered or unknown spec is surfaced as stale.
`clew coverage` writes `coverage.json` in the shared shape — atomic and wholesale — and prints a per-status report. It is informational: it always exits 0, whether or not gaps exist; the pass/fail gate is a later story.
