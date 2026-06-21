**Title**
The system scans the code for its anchors and produces a located record of all three relations

**Lens**: SYS

**Description**
The system shall scan the code for its anchors — all three relations, `realizes`, `verifies`, and `concerns` — and produce, from them, the machine-readable record of each anchor's spec id, relation, and location.
The scan is delegated to the per-language generators, the dual of generation, never the core (ADR-0005 D2; ADR-0001 D9).
This located record is the basis the coverage policy (SYS-012) and resolution (SYS-007) are built on: coverage counts only the eligible relations, while `concerns` supplies the impact-analysis breadth that resolution surfaces (ADR-0004; ADR-0005 D4).

**Rationale**
The compiler enforces the forward link but is blind to the reverse — a spec that *nothing* anchors.
Scanning the code for its anchors and reducing them to a uniform, located record is what makes "is everything implemented and tested?" answerable at all, and what every downstream consumer reads — the reverse-direction completeness the approach requires (ADR-0001 D6; ADR-0005 D1).

**Verification Description**
Scanning a codebase yields the anchors it contains, each located and tagged with its relation (`realizes`, `verifies`, or `concerns`); the record is emitted in a machine-readable form independent of any one target language.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)
