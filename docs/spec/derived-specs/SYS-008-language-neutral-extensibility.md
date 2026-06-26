**Title**
The system supports arbitrary target languages through pluggable generators

**Lens**: SYS

**Status**: active

**Description**
The system shall support arbitrary target languages through pluggable generators, with no language assumption in the core — adding a language is a new generator, not a core change.

**Rationale**
The value of the approach must not be confined to one language; keeping all language knowledge behind a narrow generator contract (ADR-0001 D9) is what lets the same traceability work for a TypeScript, Java, or C codebase, and keeps the cost of a new language at one implementation.

**Verification Description**
A target language is added by implementing the generator contract; the core references no concrete generator; existing languages are unaffected.

## Relations

**Realizes**

- [STK-008 — The approach works across the team's languages](STK-008-polyglot-applicability.md)
