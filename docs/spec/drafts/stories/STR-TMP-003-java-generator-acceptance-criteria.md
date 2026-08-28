**Title**
The Java generator carries criteria as spec-constructor slots and verifies with a (spec, criterion) annotation

**Status**: planned

**Business Value**
The Java target gains the criterion grain while keeping both anchors as annotations — the form SW-037 is built around — so a Java project reads `@VerifiesSoftware(spec = …, ac = …)` with the same compiler-held guarantee it has today.

**Problem / Context**
The engine tier (STR-TMP-001) makes a criterion an addressable unit, but Java's annotation rules resist the member form the other targets use.
A Java annotation element must be a single concrete enum type (SW-037 already states this), so a criterion referenced as a per-spec member cannot be an annotation value — which would force `verifies` to stop being an annotation and become a call, breaking the symmetry SW-037 deliberately keeps.
The Java generator (SW-037) therefore needs a criterion representation that is still one enum type, and discovery (SW-038) needs to read a criterion from the annotation.

**Solution Approach**
Represent a spec's criteria as slots on a single per-set criterion enum, and let a spec constant declare which slots it owns, so both anchors stay annotations (revises SW-037, SW-038).

1. **Emit** — for a spec set **in which at least one spec declares criteria**, the generator emits a criterion enum alongside the traceable enum — one constant per criterion in the set — and each such spec constant declares the criteria it owns as constructor arguments, `SW_014_SUBMIT_ORDER(AC_01, AC_02, AC_03)`.
The `AC_01…` is shorthand: each criterion constant is qualified by its parent spec and stable local id — unique within the set — with a title suffix for readability, and discovery reads the id part and ignores the title, so a generic or duplicated criterion title cannot collide.
`realizes` / `concerns` keep the existing spec annotation unchanged; `verifies` **keeps its single-member `value()` as the spec and gains an optional `ac()` element** — so `@VerifiesSoftware(SW_014)` is unchanged (the implicit criterion) and `@VerifiesSoftware(value = SW_014, ac = AC_02)` names a criterion, `ac` being one concrete enum type and so a legal annotation value.
Because a set has **more criteria than specs**, the criterion enum grows faster than the traceable enum, so it is **partitioned per spec set for the same reason the traceable enums are (SW-015)** — a single corpus-wide criterion enum would overflow Java's per-class constant limit; a set in which no spec declares criteria emits no criterion enum.

2. **Ownership is a check rule** — because a criterion is a shared slot rather than a per-spec member, `javac` verifies the slot *exists* but not that it *belongs* to the named spec; that a `verifies` names a slot the spec declared is enforced by `clew check` against the spec's declared slot set, not the compiler (a new CON pinning this deliberate boundary — the one place the criterion grain is check-time rather than compile-time, and why).

3. **Discover** — discovery (SW-038) reads a `verifies` annotation's `spec` and `ac` elements as the (spec id, criterion local id) pair; `realizes` / `concerns` discovery is unchanged.

**Acceptance Criteria**
- For a spec set in which a spec declares criteria, the generator emits a criterion enum with one constant per criterion, partitioned per set (SW-015) because criteria outnumber specs; each such spec constant declares its owned criteria as constructor arguments, and a set with none emits no criterion enum.
- `realizes` / `concerns` keep the existing single-enum spec annotation; `verifies` keeps its spec `value()` and adds an optional enum-typed `ac()`, so a reference to a missing spec or a missing criterion is a `javac` compile error and a spec-only verify targets the implicit criterion.
- That a verified criterion is one the spec *declared* is enforced by `clew check`, not the compiler; a `verifies` naming an undeclared criterion is a check failure, and this boundary is pinned by its own constraint spec.
- Pre-existing `@VerifiesSoftware(SPEC)` anchors are **unchanged** — they verify the implicit criterion — and a set with no declared criteria emits byte-identical output (CON-012).
- Discovery recovers the (spec id, criterion local id) pair from a `verifies` annotation; the ids emitted for a fixture equal the ids discovered from it (round-trip, ARCH-004).
- Re-running on unchanged spec sets produces byte-identical files (CON-012).

**Out of scope**
- The engine-side model, schema, and coverage aggregation — STR-TMP-001.
- The TypeScript and Swift renderings, which nest the criterion as a spec member and so keep ownership compile-checked — STR-TMP-002, STR-TMP-004; the Java target trades member-nesting for the annotation form, and that trade is the subject of this story's constraint spec.
- Wiring the Java generator into this repository's configuration — it stays the reservation-example target; only its output contract changes.
