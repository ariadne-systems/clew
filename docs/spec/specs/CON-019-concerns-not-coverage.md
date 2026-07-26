**Title**
`concerns` never contributes to coverage

**Lens**: CON

**Status**: active

**Description**
Only `realizes` and `verifies` establish that a spec is realized or verified; a `concerns` anchor establishes neither.
A spec named only by `concerns` is None.

**Rationale**
Coverage must mean implemented and tested, so a mere coupling cannot raise a spec's status — otherwise coverage could be gamed by mentioning a spec.

**Verification Description**
A spec anchored only by `concerns` is None; adding `realizes` makes it Realized and `verifies` makes it Verified.

## Relations

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)
