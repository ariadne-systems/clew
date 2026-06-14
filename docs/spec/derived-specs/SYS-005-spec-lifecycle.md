**Title**
The system supports drafting, allocating, and finalizing specs

**Lens**: SYS

**Description**
The system shall support drafting, allocating, and finalizing specs — minting ids (including unbound temporary ids) and promoting reviewed drafts into the corpus.

**Rationale**
Specs are authored iteratively; making allocation and promotion first-class keeps the authoring loop cheap and keeps unapproved work from consuming real ids (ADR-0001 D3).

**Verification Description**
Temporary ids can be minted without advancing state; promotion binds real ids and finalizes drafts; the workflow is exercised end to end.

## Relations

**Realizes**

- [STK-003 — Low authoring friction](STK-003-low-authoring-friction.md)
