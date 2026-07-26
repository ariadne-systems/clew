**Title**
The system resolves a spec id to its current location and surfaces the specs related to it

**Lens**: SYS

**Description**
The system shall resolve a spec id to its current location and metadata, and surface the specs related to it, so a reference can be followed in one hop and the neighbourhood of a change can be seen.

**Rationale**
Anchoring binds code to an id, but an id is only useful if it resolves to where the spec lives now and to what relates to it; resolution and one-hop navigation turn the trace graph into something an author — or an agent assembling scoped context — can walk (ADR-0001 D4, D7).
The context *assembly* is the agent's job, the skills layer; the system's part is to make the data resolvable and navigable.
The committed index and resolver are a planned capability — the scan's locations index is a step toward it.
The index is a derived, rebuildable cache, not the source of truth: the truth is the specs and the anchors in the code, and the index is rebuilt from them if lost (ADR-0001 D4).

**Verification Description**
Resolving an id yields its current location and metadata; the specs related to it are surfaced; following a reference does not require a manual search.

## Relations

**Realizes**

- [STK-005](STK-005-reuse-over-reinvention.md)
- [STK-002](STK-002-audit-evidence.md)
