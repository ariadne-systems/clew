**Title**
Emit the Java generator's traceable output — per-set enums and anchoring annotations — and discover them back

**Business Value**
clew's promise (SYS-008) is that the same compile-checked traceability and reverse scan work across a team's languages, not TypeScript alone.
The Java generator today is only the STR-011 skeleton: it emits a placeholder enum shape but nothing a Java codebase can anchor to, and its discovery returns nothing — so a Java project can neither mark code as realizing a spec nor have those anchors appear in coverage.
This brings Java to the working state TypeScript already has (STR-014, SW-021): real anchoring and a reverse scan, so clew delivers on a Java codebase.

**Problem / Context**
The generator contract is language-neutral (ARCH-003 / ARCH-004 / ARCH-006), and the TypeScript generator implements it fully: it emits per-set enums plus anchoring helpers (SW-018) and discovers its own markers back (SW-021).
The Java generator, from the skeleton, emits a single `Traceables.java` of nested enums with an `id()` accessor but no anchoring mechanism — nothing marks a Java package, type, method, or field as realizing, verifying, or concerning a spec — and its `discover` is stubbed to return nothing, so coverage sees no Java anchors.
Java differs from TypeScript in one decisive way: it has real annotations that apply to package, type, method, and field — exactly where code lives — so Java needs neither TypeScript's wrapper functions nor its type markers; a generated annotation whose value is a generated enum member is anchoring that `javac` enforces.

**Solution Approach**
Complete the Java generator to the same contract, in Java's idioms:

- Emit one enum per spec set — member name derived from the spec's filename (carrying id and slug), the value the spec id read back through an `id()` accessor — under a generated, do-not-edit header carrying the same `@ariadne-thread` provenance the TypeScript banner carries; a `deprecated` spec's member is marked `@Deprecated` (SW-014) rather than dropped, so its anchors keep compiling.
- Emit, per spec set, an annotation for each relation (`realizes` / `verifies` / `concerns`, ADR-0004) bound to that set's enum — `@Retention(SOURCE)`, `@Repeatable`, applicable to package/type/method/field; because the value is an enum member, `javac` makes a reference to a removed spec a compile error (SYS-001), the Java counterpart of `tsc` enforcing the TypeScript union. An anchor spanning two sets stacks the two sets' annotations.
- Implement `discover`: a lexical scan (the shared C-family lexer in its Java dialect — text blocks, no regex or template literals) that finds each annotation form in code regions only, reads the referenced enum member(s), and resolves each to its spec id from the member name — round-tripping with generation (ARCH-004; the ids emitted are exactly the ids discovered).
- The generated folder stays deterministic and tool-owned (CON-012) and inert to its own scan (CON-030), exactly as the TypeScript output is.

**Decisions** (resolved)
- **Enum layout — one enum per spec set, not one combined enum.**
A single enum of every traceable would grow without bound and hit Java's per-class limits; keeping symbol sets small is the reason spec sets exist (SW-015).
Because a Java annotation element must be an enum type (never an interface), per-set enums entail per-set annotations — an annotation binds to exactly one set's enum, so members of different sets cannot share one annotation.
- **Annotation naming — per-set, per-relation, named for the relation verb.**
`@RealizesSoftware` / `@VerifiesSoftware` / `@ConcernsSoftware`, `@RealizesConstraint`, … — so a Java anchor reads like the spec relation and the TypeScript marker.
- **Value accessor — `id()`.**
The generated enum exposes its spec id through an `id()` accessor, as the skeleton already emits, naming exactly what it returns.

**Acceptance Criteria**
- For each spec set, the generator emits one Java enum whose members carry the id-and-slug name and the spec id (via `id()`), under a generated-do-not-edit provenance header; a `deprecated` spec's member is present and marked `@Deprecated`.
- The generator emits the anchoring annotations (one per relation), source-retained and repeatable, applicable to package/type/method/field, referencing the generated enum members; an annotation referencing a removed member fails to compile.
- `discover` returns every anchor in Java source — its spec id, relation, and location (file, line) — reading only code regions (a marker-shaped token in a comment, string, char literal, or text block is not an anchor), and the ids it recovers are exactly the ids the generator emitted for the same markers (the round-trip).
- Re-running on unchanged specs is byte-identical (CON-012); the generated output is inert to its own discover and comment scan (CON-030).
- Tests cover the per-set enums, the annotations, `@Deprecated` on a deprecated member, discovery of each annotation form with id/relation/location, the code-region-only rule (text block, comment, string), idempotency, and the generation↔discovery round-trip.

**Out of scope**
- Any change to the language-neutral contract (ARCH-003 / ARCH-004 / ARCH-006) or to grouping and status handling (SW-014 / SW-015 / SW-031) — Java implements the existing contract.
- The TypeScript generator's output — unchanged.
- Shipping a hand-written Java annotation library — the annotations are emitted into the consuming project, tool-owned like the enums (CON-012), not published as a dependency.

## Relations

**Realizes**

- [SYS-008 — The system supports arbitrary target languages through pluggable generators](../derived-specs/SYS-008-language-neutral-extensibility.md)

**Realizes** (new specs)

- [SW-037 — The Java generator emits per-set enums and anchors code with generated annotations](../derived-specs/SW-037-java-annotation-anchored-output.md)
- [SW-038 — Discover anchors in Java via a lexical scan](../derived-specs/SW-038-discover-anchors-java.md)

**Related**

- Parallels [STR-014 — Emit the TypeScript generator's traceable output](STR-014-typescript-generator.md) — the same completion, for the Java target.
- Implements [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](../derived-specs/ARCH-003-generator-interface.md) and [ARCH-004 — Generation and reading back are dual operations](../derived-specs/ARCH-004-generator-discovers-markers.md) for Java.
- Uses [ARCH-006 — Comment detection is a generator capability](../derived-specs/ARCH-006-pluggable-comment-finders.md) — Java comment identification through the shared C-family lexer.
- Builds on the skeleton generators from [STR-011 — the `clew spec` command](STR-011-spec-command.md).
