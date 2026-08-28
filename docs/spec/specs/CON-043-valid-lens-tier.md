**Title**
A lens's tier is one of intent, requirement, or criterion

**Lens**: CON

**Status**: planned

**Description**
A lens's `tier` is one of `intent`, `requirement`, or `criterion`, or absent (meaning `requirement`).
An unrecognised value is rejected — configuration reading fails fast rather than guessing.

**Rationale**
A typo in a tier must not silently mis-place a spec on the altitude ladder or drop it to the default unnoticed; rejecting it keeps the tier trustworthy, the same guarantee the status value carries (CON-022).

**Verification Description**
Each of the three values, and an absent tier, are accepted; any other value is rejected with a stable error.

## Relations

**Realizes**

- [SYS-010](SYS-010-configurable-lenses.md)

**Related**

- The tier counterpart of the status rule [CON-022](CON-022-valid-status.md).
- Constrains the tier read by [SW-055](SW-055-lens-declares-tier.md).
