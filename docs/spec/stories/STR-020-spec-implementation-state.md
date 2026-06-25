**Title**
Each spec declares its implementation state — the optional `implemented` coverage scope

**Business Value**
The coverage gate holds **every** spec to Covered-or-waived. A spec-first project authors specs ahead of the code, so that gate would flag the whole backlog — you would waive dozens of specs you simply have not built yet, which is exactly the noise the waiver list exists to avoid.
This story adds the optional **`implemented` scope**: each spec declares whether it is implemented, and the gate then holds only implemented specs to account, leaving the backlog reported but not required.

**Problem / Context**
With the gate over all specs, a project that authors ahead must waive its entire backlog to pass.
There is no way to say "this spec is built — hold it to coverage" versus "this is still backlog."
The scan needs to carry each spec's implementation state so the gate can be narrowed to it.

**Solution Approach**
A spec declares its state in a `**Status**` field — `not-implemented` (the default when absent), `implemented`, or `deprecated`.
The spec scan reads it onto each traceable and rejects an unrecognized value, and `coverage.scope: implemented` narrows the gate to specs marked implemented; the rest are reported but not required.
Setting the state is an authoring act — the agent marks a story's specs `implemented` as its final step — so it lives in the authoring skill, not the tool.
The status is intrinsic to the spec's source; for files it is the `**Status**` field, and a future ALM connector would map it from the work item's state.

**Acceptance Criteria**
- A spec with `**Status**: implemented` is scanned implemented; `**Status**: deprecated` as deprecated; no `**Status**` field as `not-implemented`.
- An unrecognized status value is rejected with a clear error.
- With `coverage.scope: implemented`, the gate holds only implemented specs to Covered-or-waived; not-implemented and deprecated specs are reported but do not fail it.
- With `coverage.scope: all` (the default, or this layer absent), every spec is required, as in the base gate.
- Vitest covers each declared value, the absent-field default, the rejection of an invalid value, and the implemented-scoped check.

**Decisions**
- **Optional layer over the gate** — `coverage.scope` defaults to `all`; `implemented` is opt-in for author-ahead projects.
- **State lives on the spec, not the story** — coverage reads it per traceable, with no story→spec graph parsing.
- **Absent means `not-implemented`** — authoring stays low-friction; the field is added only when a spec advances.
- **Setting it is an authoring step in the skill** — the tool defines and reads the field; the agent sets it as the last step of a story.

**Out of scope**
- **A command to set the state** — it is a field edit guided by the authoring skill.
- **The `SourceConnector` interface / ALM connector** — the file `**Status**` is the only source now; ALM is someday and additive.

## Relations

**Realizes** (temporary ids; bound and substituted on promotion)

- [SW-031 — The spec scan reads each spec's implementation state](../derived-specs/SW-031-scan-spec-status.md) — reads the `**Status**` field onto the traceable; absent means not-implemented.
- [CON-022 — A spec's status is one of the declared values](../derived-specs/CON-022-valid-status.md)

**Related (existing corpus)**

- Extends the traceable scan [SW-013 — Scan the configured artifacts into the set of traceables](../derived-specs/SW-013-scan-traceables.md) — it now also carries each spec's status.
- Realizes [SYS-005 — Spec lifecycle](../derived-specs/SYS-005-spec-lifecycle.md): a spec's lifecycle now includes its implementation state.
- The optional `implemented` scope this adds layers over the coverage **gate** (its own later story), which reads the A3 report.

**Artifacts** (not specs)

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration) gains a `coverage.scope` attribute (`all` | `implemented`, default `all`).
- The spec-authoring conventions gain the `**Status**` field and its values.
- A new error code for an unrecognized status value.
- A spec for the `implemented`-scope check narrowing, added when this layer is built.
