**Title**
Compute traceability coverage as a per-spec status

**Lens**: SW

**Description**
Computing coverage classifies each traceable by whether code **realizes** it and a test **verifies** it: **Covered** (both), **Realized** (realize only), **Verified** (verify only), **None** (neither).
Only `realizes` and `verifies` decide the status; `concerns` does not.

**Rationale**
Realized and verified are independent, so a single covered/uncovered bit hides the two states an audit needs — implemented-but-untested and tested-but-unimplemented.
The status makes each visible, with Covered the only complete one.

**Verification Description**
A traceable realized and verified is Covered; realized only is Realized; verified only is Verified; neither is None.

## Relations

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
