**Title**
The system anchors code to specs with compile-time-checked references

**Lens**: SYS

**Status**: active

**Description**
The system shall represent each spec as a symbol that code references and the target language's compiler verifies, so that a reference to a renamed or removed spec fails to build rather than rotting silently.

**Rationale**
The forward link from code to spec is only trustworthy if it cannot go stale unnoticed; binding it to the compiler turns "a comment that may be wrong" into "a reference that must be right" (ADR-0001 D1).

**Verification Description**
Generating the symbols for a spec set and referencing one from code compiles; removing the spec and regenerating makes the referencing code fail to build.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
