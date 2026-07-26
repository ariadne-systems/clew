**Title**
The system supports drafting, allocating, and finalizing specs

**Lens**: SYS

**Status**: active

**Description**
The system shall support drafting, allocating, and finalizing specs — minting ids (including unbound temporary ids) and promoting reviewed drafts into the corpus — and shall track each spec's implementation state (`planned`, `active`, or `deprecated`) once it is in the corpus.

**Rationale**
Specs are authored iteratively; making allocation and promotion first-class keeps the authoring loop cheap and keeps unapproved work from consuming real ids (ADR-0001 D3).

**Verification Description**
Temporary ids can be minted without advancing state; promotion binds real ids and finalizes drafts; the workflow is exercised end to end.

## Relations

**Realizes**

- [STK-003](STK-003-low-authoring-friction.md)

## Changes

- **2026-06-25** — Broadened the lifecycle to include a spec's **implementation state** (`not-implemented` → `implemented` → `deprecated`), captured on the traceable (SW-031, CON-022; STR-020).
The authoring lifecycle (mint/promote) is unchanged; the state extends it past finalization so coverage can scope its gate to implemented specs.
- **2026-06-26** — Refined how the implementation state is used: it **filters generation** (a `planned` spec gets no traceable; a `deprecated` spec's traceable stays, marked) rather than scoping a coverage gate.
The `coverage.scope` config was dropped; scoping to active specs is structural (CON-020, SW-014; STR-020 redesign).
