**Title**
Add `clew coverage` — report which specs are covered

**Business Value**
The scan (STR-016) reads the code's anchors, but nothing compares them against the specs to answer the question the tool exists for: is every spec implemented and tested?
This story computes a per-spec **coverage** report — the artifact a reviewer or agent reads to answer "are my specs covered?" — leaving the pass/fail gate to a later story.
It is the reverse-completeness check ADR-0001 D6 envisioned, and the headline of the scanning epic.

**Problem / Context**
Forward anchoring is compile-checked; the reverse — a spec that *nothing* anchors — is invisible to the compiler (ADR-0005 D1).
STR-016 built the scan that makes the reverse readable, but it only collects anchors and judges nothing.
Comparing the anchored specs against all specs, and separating a genuine gap from a waived one, is the coverage policy (ADR-0005 D4, D5; SYS-012) — left for this story.

**Solution Approach**
Compute coverage by comparing the **anchor locations** (SW-022) against the **traceables** (SW-013).
Each traceable gets a **status** from whether it is realized and verified: **Covered** (both), **Realized** (realize only), **Verified** (verify only), **None** (neither); `concerns` does not count.
A spec is **Covered**, an open **gap**, or — if it is in the committed **waiver list** (`{ id, reason }`) — reported as **waived**, so the open-gap list converges as you cover or accept each one.
`clew coverage` reports the result — `coverage.json` (shared shape, ADR-0005 D6) and a human-readable report — and is **informational**: it always exits 0.
Turning the report into a pass/fail — the **gate** — is a separate concern and a later story; it reads this result and applies a policy, which keeps the coverage *calculation* stable while the gate evolves.

**Acceptance Criteria**
- Over a fixture of traceables `SW-1` (realized+verified), `SW-2` (realized), `SW-3` (verified), `SW-4` (`concerns` only), `CON-1` (verified), `ARCH-1` (realized), `NF-1` (verified), `clew coverage` classifies them Covered, Realized, Verified, None, Verified, Realized, Verified respectively.
- Each spec is reported as Covered, an open gap (not Covered, not waived), or waived (a committed `{ id, reason }`).
- A waiver for a Covered spec, or an unknown id, is surfaced as a stale waiver.
- `clew coverage` is informational — it always exits 0, whether or not gaps exist.
- `coverage.json` is written in the shared shape, replaced wholesale and atomically (NF-002), so an interrupted run never leaves a partial result.
- With no configuration, the command directs the user to `setup` (CON-011).
- The command is thin — it delegates to the core coverage; the CLI holds no coverage logic.
- Vitest covers each status, the `concerns`-only case, the Covered/gap/waived classification, a stale waiver, and the `coverage.json` shape with atomic wholesale replacement.

**Decisions**
- **A status, not a covered/uncovered bit** — Covered = realized and verified; Realized, Verified, and None show what is missing. Uniform for every lens; resolves ADR-0005 D4's pass condition.
- **Reporting, not enforcement** — A3 computes and reports coverage and always exits 0. Turning it into a pass/fail gate (scope, exit code, ratchet) is a separate later story; calculation and policy have different lifespans.
- **Universe = the `spec` command's traceables** (SW-013); coverage does not filter by lens.
- **No transitive coverage** (ADR-0005, as narrowed).
- **Waivers live in `.ariadnerc.json`** (ENT-002), like `exclude` / `unexclude`.
- **Eligible relations** — `realizes` and `verifies`; not `concerns`.

**Out of scope**
- The **gate** — turning the report into a pass/fail (non-zero exit), with its scope policy (`all` / `implemented`) and the spec status field; later stories.
- **Transitive coverage** and any spec→spec relation graph (ADR-0005, as narrowed).
- **Resolution / traceback** queries (B1).
- **Content-hash drift** (deferred; ADR-0001 D1).

## Relations

**Realizes**

- [SW-026 — Compute traceability coverage as a per-spec status](../derived-specs/SW-026-compute-coverage.md) — classifies each traceable by realize/verify.
- [SW-027 — Reconcile uncovered specs against the committed waiver list](../derived-specs/SW-027-apply-waivers.md) — waived versus gap; surfaces stale waivers.
- [SW-028 — Emit the coverage result](../derived-specs/SW-028-emit-coverage-result.md) — `coverage.json` (shared shape) and the human-readable report.
- [SW-029 — The `clew coverage` command](../derived-specs/SW-029-coverage-command.md) — reports coverage; informational (exits 0).
- [CON-019 — `concerns` never contributes to coverage](../derived-specs/CON-019-concerns-not-coverage.md)
- [CON-020 — The coverage universe is exactly the traceables the spec scan produces](../derived-specs/CON-020-coverage-universe.md)

**Related (existing corpus)**

- Stands on [SW-022 — Scan the code into the set of anchor locations](../derived-specs/SW-022-scan-code-into-anchor-locations.md) (the located anchors it reads) and [SW-013 — Scan the configured artifacts into the set of traceables](../derived-specs/SW-013-scan-traceables.md) (the universe it compares against).
- Its specs realize [SYS-012 — Coverage policy and waivers](../derived-specs/SYS-012-coverage-policy-and-waivers.md) and, for `coverage.json`, [SYS-013 — Shared schemas](../derived-specs/SYS-013-shared-schemas.md); both were unrealized roadmap specs until this story.
- The `coverage` command is the sibling of [SW-023 — the `scan` command](../derived-specs/SW-023-scan-command.md): scan emits the locations index, coverage reads it back.
- Picks up the coverage half deferred by [STR-016 — the anchor scan](STR-016-anchor-scan.md).
- The **gate** (the pass/fail check) and its optional `implemented` scope (the spec status field) are later stories that read this report.

**Artifacts** (not specs)

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration) gains a `waivers` attribute (`{ id, reason }`), applied on promotion as `exclude` / `unexclude` were (STR-017).
- A changeset covering the coverage feature.
