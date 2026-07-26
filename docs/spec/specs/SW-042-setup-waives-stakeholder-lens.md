**Title**
Setup waives the stakeholder lens from test coverage by default

**Lens**: SW

**Status**: active

**Description**
Setup writes a default coverage waiver for the stakeholder lens — a `waivers` entry with the pattern `STK-*` and a reason — into the scaffolded configuration, so a stakeholder spec is reported waived rather than as an open coverage gap.
The waiver is written only into a freshly scaffolded configuration; an existing `waivers` list is left as it is (CON-010).
It waives a missing *test*, not a missing implementation: a stakeholder spec still requires its realizing anchor, and only its verifying test is waived (SW-027, CON-021).

**Rationale**
Coverage is uniform — realizes plus verifies for every lens (SYS-012) — but a stakeholder need is verified by acceptance, not by a unit test, so without a waiver the first `clew check` reports every stakeholder spec as a gap that cannot be closed with a test.
The stakeholder-lens waiver is a property of the method's altitude stance, not of any one project, so shipping it as the default keeps the first coverage run honest; a project that does acceptance-test its stakeholder needs can remove it.

**Verification Description**
After `clew setup`, the configuration's `waivers` contains a `STK-*` pattern with a reason, and `clew check` reports a stakeholder spec that has a realizing anchor but no test as waived, not as an open gap.
A stakeholder spec missing its realizing anchor is still an open gap, never waived (CON-021).
A re-run leaves an existing `waivers` list unchanged.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Realizes the waiver half of [SYS-012](SYS-012-coverage-policy-and-waivers.md); the waiver is applied by [SW-027](SW-027-apply-waivers.md) and matched by [SW-030](SW-030-waiver-match-by-id-or-pattern.md).
- Never waives a missing realization — [CON-021](CON-021-missing-realize-never-waivable.md).
- Writes the `waivers` section of [ENT-002](../domain-model.md#ent-002-configuration); appends only into a fresh configuration, honouring [CON-010](CON-010-setup-never-overwrites.md).

## Changes

- **2026-07-10** — Set active: implementation of STR-029 began.
