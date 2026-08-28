**Title**
The TypeScript generator carries criteria as spec-traceable members and verifies per criterion

**Status**: planned

**Business Value**
clew's own codebase — TypeScript — can anchor at the criterion grain, so the acceptance-criteria tier (STR-TMP-001) is proven on the dogfood before any other target adopts it.
An author writes `verifies(SPEC.AC_02, …)` and the compiler holds that criterion live, exactly as it holds the spec today.

**Problem / Context**
The engine tier (STR-TMP-001) makes a criterion an addressable unit of a spec, but the TypeScript generator (SW-018) still emits a spec as a single enum member and lets `verifies` name only that member.
There is no symbol to reference for an individual criterion, so per-criterion coverage cannot be anchored in the language clew is written in.
Discovery (SW-021) likewise reads only a spec-level id from a `verifies` marker; it cannot report which criterion a test verifies.

**Solution Approach**
Extend the TypeScript generator so a criterion is a member of its spec traceable, matching the engine model (revises SW-018, SW-021).

1. **Emit** — a spec that **declares** criteria carries them as members, referenced `SPEC.AC_02`, materialised so a missing criterion is a `tsc` error just as a missing spec is (ADR-0001 D1); a spec that declares none emits **no** criterion member.
`realizes` / `concerns` keep taking the spec; `verifies` takes the **spec** (its implicit criterion) *or* a criterion member — so every existing `verifies(SPEC)` anchor is unchanged and `verifies(SPEC.AC_02)` is the per-criterion addition.
A corpus in which no spec declares criteria emits byte-identical files to today (CON-012).

2. **Discover** — the lexical scan (SW-021) reads a `verifies` marker's leading argument as `SPEC.AC_02` and resolves both the spec id and the criterion's local id from the member path, with no lookup into the generated definitions (the dual round-trip, ADR-0005 D2).
`realizes` / `concerns` discovery is unchanged.

3. **README** — the generated marker documentation gains the criterion form of `verifies`.

The member syntax `SPEC.AC_02` is the shape the engine's altitude split expects, and it is the same member reference TypeScript, Java, and Swift are meant to read alike (STR-TMP-003/004).

**Acceptance Criteria**
- The TypeScript generator emits each spec traceable with its criteria as members; a reference to an existing criterion type-checks, and removing a criterion and regenerating breaks every `verifies` anchor to it.
- `realizes` and `concerns` take the spec; `verifies` takes the spec (implicit criterion) or a criterion member; passing a criterion where a spec is required (or the reverse) is a type error.
- A spec that declares no criteria emits no criterion member and its `verifies(SPEC)` anchors are unchanged; a corpus with no declared criteria produces byte-identical files (CON-012).
- Discovery reads a `verifies` marker as `SPEC.AC_02` and recovers both the spec id and the criterion's local id from the member, with no read of the generated directory; the ids emitted for a fixture equal the ids discovered from it (round-trip, ADR-0005 D2).
- Re-running on unchanged spec sets produces byte-identical files (CON-012).

**Out of scope**
- The engine-side model, schema, and coverage aggregation — delivered by STR-TMP-001, depended on here.
- The Java and Swift renderings of the same criterion grain — STR-TMP-003, STR-TMP-004.
- Any change to the type markers `Realizes<…>` / `Concerns<…>`, which stay spec-level.
