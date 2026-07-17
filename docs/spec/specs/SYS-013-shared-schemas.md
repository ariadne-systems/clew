**Title**
The system publishes stable, machine-readable schemas for its results

**Lens**: SYS

**Status**: active

**Description**
The system shall publish and consume stable, machine-readable schemas for its results — its locations record and its coverage result — so they form a documented contract any tool can read over the same repository without translation.
The configuration is not part of that contract: it is clew's own file, described by the Configuration entity and shaped for the tool and the people that write it (ADR-0005 D6).

**Rationale**
Results that follow a stable, published schema are a contract others can depend on — for export and audit — rather than an incidental output format that breaks consumers when it changes (ADR-0005 D6).
The configuration carries no such consumer: nothing outside clew reads it, so binding its shape to a published contract would buy no interoperation while freezing the one file a project must author by hand.

**Verification Description**
The locations and coverage formats follow documented schemas; a change to a format is a deliberate, versioned change to the schema; an external reader consumes them without bespoke parsing.

## Relations

**Realizes**

- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)
- [STK-004 — Traceability data living with the code](STK-004-traceability-with-the-code.md)

## Changes

- **2026-07-17** — Narrowed the claim to the **results** — the locations record and the coverage result.
The configuration left the published contract and is clew's own (ADR-0005 D6, revised; STR-033): nothing outside clew reads it, so a cross-tool schema for it bought no interoperation while freezing the file a project must author by hand.
The **slug is deliberately unchanged**: `SYS_013_SHARED_SCHEMAS` is an anchored traceable, and renaming it would break every anchor to it for a wording gain.
Title and slug therefore no longer read quite the same story (`006` §2); the slug is kept as the stable identity, and this entry is the record of that trade-off.
