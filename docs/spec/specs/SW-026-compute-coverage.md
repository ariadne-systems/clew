**Title**
Compute traceability coverage as a per-spec status

**Lens**: SW

**Status**: active

**Description**
Computing coverage classifies each generated traceable by whether code **realizes** it and a test **verifies** it: **Covered** (both), **Realized** (realize only), **Verified** (verify only), **None** (neither).
Only `realizes` and `verifies` decide the status; `concerns` does not.
A **deprecated** traceable (SW-014) is not classified: it is excluded from the counts and the gap list and is instead **listed separately** in the report, since a spec on its way out is neither a gap to close nor coverage to claim.

**Rationale**
Realized and verified are independent, so a single covered/uncovered bit hides the two states an audit needs — implemented-but-untested and tested-but-unimplemented.
The status makes each visible, with Covered the only complete one.

**Verification Description**
A traceable realized and verified is Covered; realized only is Realized; verified only is Verified; neither is None.
A deprecated traceable is not counted in any status and is listed separately.

## Relations

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)

## Changes

- **2026-06-26** — Coverage now classifies the **generated** traceables (CON-020), and a **deprecated** traceable is excluded from the counts and the gap list and listed separately rather than classified — a retiring spec is neither a gap nor claimed coverage (STR-020 redesign).
