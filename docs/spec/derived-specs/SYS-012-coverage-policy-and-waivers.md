**Title**
The system enforces traceability coverage by default, computed by policy and admitting gaps only through committed waivers

**Lens**: SYS

**Description**
The system shall define and enforce **traceability coverage**: only eligible relations count (`realizes`, `verifies`; not `concerns`), a spec is covered through the specs that realize it where coverage is transitive, an uncovered spec fails by default, and an uncovered spec is admitted only through a committed waiver carrying a reason.

**Rationale**
Coverage is only an asset if it means "implemented and tested", cannot be gamed by a mere mention, and is not silently skipped.
Inverting the burden — covered unless waived — and computing coverage transitively keep the waiver list a genuine, reviewed inventory of gaps rather than mechanical noise (ADR-0005 D4, D5).

**Verification Description**
A spec covered only by `concerns` is reported uncovered; a spec covered through its descendants is covered, not waived; an uncovered, unwaived spec is a failure; a waiver requires a committed reason.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)
