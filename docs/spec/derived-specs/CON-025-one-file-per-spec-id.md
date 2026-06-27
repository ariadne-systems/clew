**Title**
A bound spec id is declared by exactly one file

**Lens**: CON

**Status**: active

**Description**
Each bound spec id is declared by exactly one file in the scanned artifact locations.
The scan enforces this for the ids it turns into traceables: when two files declare the same lens-bearing id, it rejects them with an error naming the id and the conflicting files, rather than silently keeping one.
A non-lens id — a story or entity — is not a traceable and is not checked by the generation scan; duplicate detection across every prefix is a corpus-integrity concern handled separately.
How the duplicate arose — a merge, a copy — does not matter.

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

## Changes

- **2026-06-27** — Set active: implementation of STR-023 began.
- **2026-06-27** — Scoped the scan's enforcement to traceable (lens) ids.
A review showed that checking non-traceable ids (stories) in the generation scan made it fail on data generation never uses, and reached past configured prefixes; comprehensive cross-prefix duplicate detection belongs to a separate integrity check.
Also recorded that a file reached twice through overlapping scan roots is not a duplicate of itself.
