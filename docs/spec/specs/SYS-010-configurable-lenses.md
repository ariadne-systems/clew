**Title**
The system uses the project's configured lenses as its traceability taxonomy and the source of truth for valid id prefixes

**Lens**: SYS

**Status**: active

**Description**
The system shall use the project's configured lens set as its traceability taxonomy and as the source of truth for valid id prefixes; the lenses are project configuration, not a hard-coded tool taxonomy.

**Rationale**
A traceability vocabulary that fits the team's method and domain is adopted; one hard-coded into the tool is fought or abandoned.
Making the configured lenses the single source of valid prefixes also removes the need for a separate id-pattern rule (ADR-0003).

**Verification Description**
The configured lenses determine which prefixes are valid; minting an unconfigured prefix is rejected; changing the lenses changes the valid set; no id pattern is configured separately.

## Relations

**Realizes**

- [STK-006 — Project-controlled traceability vocabulary](STK-006-project-controlled-vocabulary.md)
- [STK-004 — Traceability data living with the code](STK-004-traceability-with-the-code.md)
