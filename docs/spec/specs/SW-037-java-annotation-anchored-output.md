**Title**
The Java generator emits per-set enums and anchors code with generated annotations

**Lens**: SW

**Status**: active

**Description**
For the Java target, the generator emits a self-contained, tool-owned folder into its configured output directory (the generator's `outputDir`, ENT-002), which defaults to a package under `src/main/java` where the compiled, imported Java source lives.
For each spec set it emits one enum — under a generated, do-not-edit banner carrying machine-readable `@ariadne-thread` provenance (the homepage, the connector type `req-as-code`, the generator type, and the spec set) — whose members are that set's traceables: each member's name is derived from the spec's filename, so it carries the id and slug and reads as documentation at the anchor site, and its value is the spec id, read back through an `id()` accessor, for example `SW_002_MINT_SEQUENTIAL_IDS("SW-002")`.
A member whose spec is `deprecated` (SW-014) is marked `@Deprecated` and kept, so `javac` and editors surface a deprecation on every anchor to it, without removing the member and breaking the build.
Anchoring is done with generated Java annotations, not wrapper functions.
Because a Java annotation element must be an enum type (never an interface), an annotation is bound to a single set's enum; so, per spec set, the generator emits one annotation for each relation of the taxonomy (ADR-0004), named for the relation and the set — `@RealizesSoftware`, `@VerifiesSoftware`, `@ConcernsSoftware`, and so on for each set — bound to that set's enum, `@Retention(SOURCE)`, `@Repeatable`, and applicable to package, type, method, and field.
The annotations are emitted into an `annotation` subpackage beside the enums, so the base package holds only the traceable enums; each annotation imports its enum from the parent package.
An anchor names one member or a `{…}` list of members from a set's enum through that set's annotation, and — the annotations being `@Repeatable` — stacks a second set's annotation to also anchor across sets.
Because an annotation's value is an enum member, a reference to a member that no longer exists is a `javac` compile error (SYS-001) — existence is enforced by the compiler, the Java counterpart of `tsc` checking the TypeScript union — and this holds for `concerns` too, even though, being a coupling rather than a behaviour, nothing exercises it.
It also emits a `README.md` into the same folder documenting the annotations and the element each applies to, naming the relations but leaving their meaning to ADR-0004.
The helpers are generated, not a hand-written dependency.

**Rationale**
Java has annotations that apply to package, type, method, and field — where code actually lives — so, unlike TypeScript (which cannot annotate a type, a free function, or a test call and must use generated functions and type markers), Java anchors with real annotations referencing a generated enum.
Emitting one enum per spec set (SW-015) keeps each enum small — a single enum of every traceable would grow without bound and eventually exceed Java's per-class limits — and, because an annotation binds to one enum type, per-set enums are also what make the per-set annotations necessary.
An annotation's value must be enum-typed, so the compile-time guarantee comes from the enum itself: a member that no longer exists cannot be named, which is what makes a Java anchor as tamper-evident as the TypeScript union.
Source retention (`SOURCE`) is sufficient: anchoring is a build- and scan-time concern, so nothing needs the annotations at runtime.

**Verification Description**
Given grouped spec sets, the generator produces one enum file per set, each carrying a generated-do-not-edit header, its members named from the spec filenames with the spec id as value read via `id()`, plus — per set — an annotation for each relation (`realizes` / `verifies` / `concerns`) bound to that set's enum, and a `README.md`.
An anchor through any relation to an existing member compiles; an anchor referencing a member not in any enum — including one of a list — is a compile error, and removing a spec and regenerating drops its member, breaking every anchor to it.
A member whose spec is deprecated is present and `@Deprecated`, so its anchors still compile.
Re-running on unchanged spec sets produces byte-identical files (CON-012).

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)

**Related**

- Parallels [SW-018 — The TypeScript generator emits per-set string enums and an anchoring helper module](SW-018-typescript-output.md) — the same output contract for Java, with real annotations instead of function and type markers.
- Implements [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](ARCH-003-generator-interface.md) for the Java target.
- Emits one enum per spec set per [SW-015 — Group the scanned specs into spec sets](SW-015-group-traceables.md), and marks a `deprecated` member per [SW-014 — Generate the traceables through the configured generators](SW-014-generate-traceables.md).
- Tool-owned and deterministic per [CON-012 — Generated files are tool-owned](CON-012-generated-files-tool-owned.md), and inert to the scan per [CON-030 — Generated output is inert to the scan](CON-030-generated-output-inert-to-scan.md).

## Changes

- **2026-07-03** — The anchoring annotations are emitted into an `annotation` subpackage beside the enums (each importing its enum from the parent package), rather than flat alongside them, matching the idiomatic Java layout and keeping the base package to the traceable enums.
This relies on a generator being allowed to emit a nested (non-escaping) path within its output directory (SW-014).
