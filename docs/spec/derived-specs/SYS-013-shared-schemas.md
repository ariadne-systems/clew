**Title**
The system publishes stable, machine-readable schemas for its configuration and results

**Lens**: SYS

**Description**
The system shall publish and consume stable, machine-readable schemas for its configuration, its locations record, and its coverage result, so they form a documented contract any tool can read over the same repository without translation.

**Rationale**
Configuration and results that follow a stable, published schema are a contract others can depend on — for interoperation, export, and audit — rather than an incidental output format that breaks consumers when it changes (ADR-0005 D6).

**Verification Description**
The configuration, locations, and coverage formats follow documented schemas; a change to a format is a deliberate, versioned change to the schema; an external reader consumes them without bespoke parsing.

## Relations

**Realizes**

- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)
- [STK-004 — Traceability data living with the code](STK-004-traceability-with-the-code.md)
