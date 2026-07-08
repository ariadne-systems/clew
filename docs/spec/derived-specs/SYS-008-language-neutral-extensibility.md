**Title**
The system supports multiple target languages through the generator interface

**Lens**: SYS

**Status**: active

**Description**
The system shall support multiple target languages through generators behind a narrow interface.
Adding a language is one in-tree generator that implements the generator contract, plus its registration; the core uses every generator through the interface and binds the concrete generators at a single registry point.

**Rationale**
The value of the approach must not be confined to one language; keeping all language knowledge behind a narrow generator contract is what lets the same traceability work for a TypeScript, Java, or C codebase, and keeps the cost of a new language at one implementation (ADR-0001 D9, as revised by ADR-0007).

**Verification Description**
A target language is added by implementing the generator contract and registering it; generation runs through the interface; existing languages are unaffected.

## Relations

**Realizes**

- [STK-008 — The approach works across the team's languages](STK-008-polyglot-applicability.md)

## Changes

- **2026-07-08** — Revised for ADR-0007, which folds the in-tree generators into the core.
Dropped the guarantee that the core references no concrete generator and that adding a language is never a core change; the core now binds its in-tree generators at a single registry point.
The capability is unchanged — multiple languages behind the generator interface, one implementation per language — but it is no longer delivered through separate generator packages.
Adjusted the title to match.
