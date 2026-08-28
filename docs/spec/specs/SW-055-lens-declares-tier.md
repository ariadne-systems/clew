**Title**
Each lens declares a tier, read onto the resolved lens

**Lens**: SW

**Status**: planned

**Description**
Each configured lens may declare a `tier` — `intent`, `requirement`, or `criterion` — read onto the resolved lens beside its id and description.
A lens with no `tier` resolves to `requirement`, the documented default, so a configuration written before tiers keeps working.
The default lens set is pre-tiered: STK is `intent`; SYS, SW, ARCH, NF, CON, and ENT are `requirement`.

**Rationale**
The lens is where a spec's kind is already resolved, so its altitude belongs there too — read once, beside the id and description, rather than inferred by every consumer.
Defaulting an absent tier to `requirement` keeps the attribute additive: an existing configuration gains the field's default without editing, honouring the configuration's every-attribute-has-a-default invariant (ENT-002).

**Verification Description**
A lens declaring `tier: intent` resolves with that tier; a lens with no tier resolves to `requirement`; each default-set lens resolves to its shipped tier (STK intent, the rest requirement).

## Relations

**Realizes**

- [SYS-010](SYS-010-configurable-lenses.md)

**Related**

- Its tier value is constrained by [CON-043](CON-043-valid-lens-tier.md).
- Grows the lens shape documented by [ENT-002](ENT-002-configuration.md).
- The altitude sibling of the status read by [SW-031](SW-031-scan-spec-status.md).
- Read by the trace-manifest emitter [SW-053](SW-053-trace-manifest-emitter.md) to fill each row's tier.
