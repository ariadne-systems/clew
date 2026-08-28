**Title**
A Swift generator anchors through macros, criterion-aware from its first emission

**Status**: planned

**Business Value**
clew gains a third target — Swift — so an iOS/Swift codebase can anchor its code to specs with the same compiler-held guarantee TypeScript and Java have.
Because it is built after the acceptance-criteria tier (STR-TMP-001), it carries the criterion grain from the start, with no later retrofit — the reason the tier is sequenced before this generator.

**Problem / Context**
clew supports TypeScript and Java; there is no Swift generator, so a Swift project cannot participate in the method at all — the closest a team gets is hand-maintained id comments checked by a grep, which rot between runs and cannot be navigated.
Swift has the pieces to do better: attached macros (5.9+) for an attribute-style anchor, and enums with nested types and static members for a self-describing traceable.
A new generator must implement the whole generator contract (ARCH-003) — generate, discover, and comment identification — and, since it lands after STR-TMP-001, must render criteria natively rather than bolt them on.

**Solution Approach**
Add an in-tree Swift generator behind the generator interface (ARCH-003), registered at the single registry point (ADR-0007), criterion-aware from the first emission.

1. **Emit** — for each spec set, emit the traceables as Swift enums whose members carry the id and slug; a spec that **declares** criteria exposes them as members, so a criterion reads `SPEC.ac02` — the same member form as TypeScript — and a spec that declares none exposes no criterion member.
Anchors are attached macros: `@Realizes` / `@Concerns` take the spec, `@Verifies` takes the spec (its implicit criterion) or a criterion member; because a Swift macro argument is an ordinary expression, the nested criterion reference is legal in the attribute, so Swift keeps both member-nesting and the attribute form (unlike Java).
A `deprecated` spec's member is marked with Swift's availability/deprecation attribute and kept, so its anchors keep compiling (SW-014).

2. **Discover** — implement discovery for the Swift markers: read each `@Realizes` / `@Verifies` / `@Concerns` and recover the spec id, and for `verifies` the criterion, from the member path, considering only code regions.
Comment identification uses the shared C-family lexer in a Swift dialect (ARCH-006) — line and block comments, string and multiline-string literals — so a marker inside a comment or string is not an anchor.

3. **Register** — bind the Swift generator at the registry so configuring `type: "swift"` selects it, with no change to the core (ARCH-003).

The new spec drafts this story needs — the Swift emission contract, Swift discovery, and the Swift comment dialect — are authored in the follow-up drafting pass; they parallel SW-018/SW-021 (TypeScript) and SW-037/SW-038 (Java) for the Swift target.

**Acceptance Criteria**
- Configuring a Swift generator emits, per spec set, Swift enums whose members carry id and slug, each spec exposing its criteria as members; a reference to an existing spec or criterion compiles and a removed one breaks its anchors on regeneration.
- Anchors are macros: `@Realizes` / `@Concerns` take the spec, `@Verifies` takes the spec (implicit criterion) or a criterion member (`SPEC.ac02`); a spec that declares no criteria exposes no member; a `deprecated` member is kept and marked so its anchors still compile.
- Discovery recovers the spec id from every marker and the criterion from a `verifies`, reading only code regions via the shared lexer's Swift dialect; a marker in a comment or string yields no anchor; the ids emitted for a fixture equal the ids discovered (round-trip, ARCH-004).
- The generator implements the full contract — generate, discover, comment identification — behind the interface, and is selected purely by configuration with no core change (ARCH-003).
- Re-running on unchanged spec sets produces byte-identical files (CON-012).

**Out of scope**
- The engine-side criterion model and coverage aggregation — STR-TMP-001, depended on here.
- Wiring Swift into *this* repository's configuration — clew's own source is TypeScript; Swift is proven against a Swift fixture/example, not adopted here.
- A function-call anchor form as an alternative to macros — the macro/attribute form is the target; a callable fallback is a later increment only if a pre-macro Swift version must be supported.
- An importer that turns an existing Swift project's id comments into anchors — a separate initiative.
