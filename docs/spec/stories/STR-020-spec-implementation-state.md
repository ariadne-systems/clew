**Title**
Each spec declares its implementation state, which filters generation

**Business Value**
The coverage gate holds **every** spec to Covered-or-waived. A spec-first project authors specs ahead of the code, so that gate would flag the whole backlog — you would waive dozens of specs you simply have not built yet, which is exactly the noise the waiver list exists to avoid.
This story adds an **implementation status** to each spec and makes generation emit a traceable only for built specs: the coverage universe is exactly the active (and deprecated) specs, and the backlog is simply not generated, so it never enters coverage at all.

**Problem / Context**
With the gate over all specs, a project that authors ahead must waive its entire backlog to pass.
There is no way to say "this spec is built — hold it to coverage" versus "this is still backlog."
The scan needs to carry each spec's implementation state so the gate can be narrowed to it.

**Solution Approach**
A spec declares its state in a `**Status**` field — `planned` (the default when absent), `active`, or `deprecated`.
The spec scan reads it and rejects an unrecognized value; **generation emits a traceable only for `active` and `deprecated` specs** — a `planned` spec gets none and is outside the coverage universe (CON-020), and a `deprecated` spec's traceable is emitted **marked deprecated** (SW-018) so its anchors keep building. Coverage measures against the generated traceables and lists deprecated specs without counting them (SW-026).
Setting the state is an authoring act — the agent marks a story's specs `active` as it begins implementing them, so the traceables generate and the code can anchor — so it lives in the authoring skill, not the tool.
The status is intrinsic to the spec's source; for files it is the `**Status**` field, and a future ALM connector would map it from the work item's state — queried once at generation, not re-read per coverage run.

**Acceptance Criteria**
- A spec with `**Status**: active` is scanned active; `**Status**: deprecated` as deprecated; no `**Status**` field as `planned`.
- An unrecognized status value is rejected with a clear error.
- A `planned` spec is not generated (no traceable) and is outside the coverage universe; an `active` spec is generated and classified like any other.
- A `deprecated` spec's traceable is emitted marked deprecated, stays anchorable, and is listed in coverage without being counted.
- Vitest covers each declared value, the absent-field default, the rejection of an invalid value, the generation filter, and the deprecated marking.

**Decisions**
- **Status filters generation, not a coverage-time scope** — a `planned` spec is not generated, so the coverage universe is the generated traceables; scoping to active specs is structural, not a config option.
- **State lives on the spec, not the story** — generation reads it per spec, with no story→spec graph parsing.
- **Absent means `planned`** — authoring stays low-friction; the field is added only when a spec advances.
- **Setting it is an authoring step in the skill** — the tool defines and reads the field; the agent sets a spec `active` as it begins implementing it.

**Out of scope**
- **A command to set the state** — it is a field edit guided by the authoring skill.
- **The `SourceConnector` interface / ALM connector** — the file `**Status**` is the only source now; ALM is someday and additive.

## Relations

**Realizes** (temporary ids; bound and substituted on promotion)

- [SW-031 — The spec scan reads each spec's implementation state](../specs/SW-031-scan-spec-status.md) — reads the `**Status**` field onto the scanned spec; absent means planned.
- [CON-022 — A spec's status is one of the declared values](../specs/CON-022-valid-status.md)

**Related (existing corpus)**

- Extends the traceable scan [SW-013 — Scan the configured artifacts into the set of traceables](../specs/SW-013-scan-traceables.md) — it now also carries each spec's status.
- Realizes [SYS-005 — Spec lifecycle](../specs/SYS-005-spec-lifecycle.md): a spec's lifecycle now includes its implementation state.
- The generation filter this adds also bounds the coverage **gate** (its own later story), which reads the A3 report — only active specs are held to account.

**Artifacts** (not specs)

- Generation filters by status (SW-014); coverage reads the universe back through the generator (ARCH-004, CON-020). No `coverage.scope` config — the scope is structural.
- The spec-authoring conventions gain the `**Status**` field and its values.
- A new error code for an unrecognized status value.
- The deprecated marking in the TypeScript output (SW-018).


## Changes

- **2026-06-26** — Pivoted, mid-implementation, from a `coverage.scope` config to **status-filtered generation**.
The original design read each spec's status per coverage run to narrow a gate (`coverage.scope: all | implemented`); the implemented design instead emits a traceable only for `active`/`deprecated` specs, so the coverage universe — the generated traceables (CON-020) — is the built specs, and the backlog is never generated.
A `deprecated` spec's traceable stays, marked (SW-018), and is listed without counting (SW-026); `coverage.scope` was dropped from ENT-002.
Why: re-reading status per coverage run does not scale to an ALM-sourced status, and dropping a deprecated spec's traceable would break every anchor's build at once.
The body above is the implemented design; this records the pivot from the original.
