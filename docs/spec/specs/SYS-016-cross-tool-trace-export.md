**Title**
The system exports its trace state into an external interchange format for cross-tool consumption

**Lens**: SYS

**Status**: planned

**Description**
The system shall export its trace state — its specs with their statements and parent relations, each spec's coverage status, and the code that realizes and verifies it — into a documented, versioned interchange format defined outside clew, so a cross-tool consumer such as a shared viewer or dashboard can render a clew project without bespoke translation.
This export is a distinct artifact from clew's own published result schemas (SYS-013): those publish clew's shapes for others to read; this conforms clew's data to a foreign contract.

**Rationale**
A clew project's trace state is only as visible as the tools that can read it.
Publishing clew's own schemas (SYS-013) lets a clew-aware reader consume its results; conforming to an external interchange format lets an entire ecosystem of cross-tool viewers consume them too, without each building a clew adapter.
Emitting into an existing format reuses that ecosystem's tooling rather than clew growing a viewer of its own.

**Verification Description**
Satisfied when the system, from a repository's specs and anchors, produces a file in the documented external interchange format that a conforming external reader consumes without clew-specific parsing, and that is byte-stable for a fixed input.

## Relations

**Realizes**

- [STK-002](STK-002-audit-evidence.md)

**Related**

- The outward counterpart of [SYS-013](SYS-013-shared-schemas.md): SYS-013 publishes clew's own result schemas; this emits into a format clew does not own.
- Derives its rows from the coverage policy of [SYS-012](SYS-012-coverage-policy-and-waivers.md) without altering it.
