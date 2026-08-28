**Title**
clew's lenses declare a tier

**Status**: planned

**Business Value**
clew's lenses carry an implicit altitude — a stakeholder need (STK) sits above a system capability (SYS), which sits above a software behaviour (SW) — but that ordering lives only in the author's head, not in the tool.
Making each lens declare its tier — intent, requirement, or criterion — turns that implicit ladder into data clew can read: it records every spec's altitude beside its finer lens, so clew's own reporting and the trace export can group and navigate by it.
It costs one additive attribute — no re-identification, no loss of the lens detail.

**Problem / Context**
A lens is `{ id, description }` (ENT-002): a flat set with no declared altitude.
clew therefore cannot say whether a spec is a stakeholder intent or a software requirement — the altitude each lens implies is never recorded, so nothing can place a spec on the intent-requirement-criterion ladder.
The immediate consequence is that the trace-manifest export has no tier to emit (SW-053); the general one is that clew's altitude is knowledge, not data.

**Solution Approach**
Give each configured lens an optional `tier` — one of `intent`, `requirement`, `criterion` — read onto the resolved lens beside its id and description.
Ship the default lens set pre-tiered: STK is `intent`, and SYS, SW, ARCH, NF, CON, ENT are `requirement`; the criterion tier is left for the acceptance-criteria work, its own story.
A lens with no declared tier defaults to `requirement`, the common case, so an existing configuration needs no change; an unrecognised tier value is rejected, the same way an unrecognised status is.
The lens's finer identity stays in the lens id, and clew's deeper altitude — a system above a software requirement — stays in the spec relations; the tier is the coarse rung, not a replacement for either.

**Acceptance Criteria**
- Each configured lens may declare a `tier` of `intent`, `requirement`, or `criterion`, read onto the resolved lens beside its id and description.
- The default lens set is pre-tiered: STK is `intent`; SYS, SW, ARCH, NF, CON, ENT are `requirement`.
- A lens with no `tier` resolves to `requirement`; an existing configuration without tiers keeps working unchanged.
- An unrecognised `tier` value is rejected with a stable error code, the same shape as an unrecognised status.
- The configuration entity (ENT-002) documents the added `tier` attribute; the addition is additive, changing no existing attribute in place.
- Tests cover a declared tier, the default when absent, each default-set lens's tier, and an unrecognised tier rejected.

**Out of scope**
- The criterion tier's artifacts — authoring acceptance criteria as specs — which is its own story; this only makes the tier declarable.
- Any change to lens ids, spec ids, or the configurability of lenses (ADR-0003); the tier is additive metadata, nothing is re-identified.
- Consuming the tier — the trace-manifest export reads it (SW-053), but that belongs to the export story; here the tier is only produced.
- More tier values than the three; the ladder is deliberately intent, requirement, criterion, with the finer altitude carried by the lenses and relations.

## Relations

**Realizes** (new specs)

- [SW-055](../specs/SW-055-lens-declares-tier.md)
- [CON-043](../specs/CON-043-valid-lens-tier.md)

**Related**

- Extends the lens taxonomy of [SYS-010](../specs/SYS-010-configurable-lenses.md) with an altitude tier.
- Grows the configuration entity [ENT-002](../specs/ENT-002-configuration.md) by one additive attribute.
- Consumed by the trace-manifest export [STR-044](STR-044-export-trace-manifest.md): the tier it declares is the tier the export emits.
