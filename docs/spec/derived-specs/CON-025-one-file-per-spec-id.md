**Title**
A bound spec id is declared by exactly one file

**Lens**: CON

**Description**
Each bound spec id is declared by exactly one file in the scanned artifact locations.
When two files declare the same id, the scan rejects the corpus with an error naming the id and the conflicting files, rather than silently keeping one.
The check is on the bound id; how the duplicate arose — a merge, a copy — does not matter.

**Rationale**
Every trace is keyed on the id (SYS-003); if two files share an id, generation and coverage act on whichever the scan happened to visit last, so one spec silently vanishes from the graph while the other's anchors may bind against the wrong file.
Failing fast on the ambiguity — as the scan already does for a spec that matches two spec sets, or none — keeps the corpus's identity trustworthy and makes the conflict immediately fixable instead of silently corrupting.

**Verification Description**
A scan of two files declaring the same id is rejected with an error naming the id and both files.
A scan of distinct ids succeeds.
The rejection does not depend on the order the files are visited.

## Relations

**Realizes**

- [SYS-003 — The system allocates unique, stable, persistent spec ids](SYS-003-stable-spec-identity.md)

**Related**

- Constrains [SW-013 — Scan the configured artifacts into the set of scanned specs](SW-013-scan-traceables.md) — the scan that enforces it.
- Mirrors [CON-013 — Each scanned spec belongs to exactly one spec set](CON-013-spec-set-partition.md) — both fail fast on an ambiguous corpus.
