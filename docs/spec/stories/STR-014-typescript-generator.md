**Title**
Emit the TypeScript generator's traceable output — per-set files with a union and anchoring helpers

**Business Value**
The skeleton TypeScript generator emits one placeholder file; this defines the real output — the means by which TypeScript code anchors to a spec id with existence enforced by `tsc`, the equivalent of the Java annotation referencing a generated enum.
Without it the TypeScript target has no working compile-checked trace, so the tool's core promise does not reach a TypeScript codebase.

**Problem / Context**
TypeScript has no annotation that can mark a `type`, a free function, or a `test(...)` call: decorators are a runtime construct that applies only to classes and their members, which is not where most code lives.
The skeleton generator (STR-011) emits per-set union types and helpers in a single throwaway file as a first working emission.
We need the generator's full, documented output: one generated file per spec set — structured like the reference Java/TypeScript traceable files (a generated-do-not-edit header, the set's symbols, deprecation marking) — built on a mechanism that makes a removed id a compile error.

**Solution Approach**
Running `ariadne spec` generates a self-contained folder in the project — tool-owned, regenerated, never hand-edited — holding both the symbols and the means to anchor against them.
The helpers are *emitted*, not shipped: nothing lives in the tool's codebase as a hand-written package, and the consuming project imports only generated code.
The mechanism is a generated union plus type-constrained helpers, checked by `tsc` — not decorators:

- Per spec set, the generator emits one file with a "generated — do not edit" header carrying its provenance (the spec set it was emitted from), declaring the set's ids as a union type — for example `export type SoftwareTraceableId = "SW-001" | "SW-002";` (a union, not a `const enum`, and not one flat list across sets).
- A generated helper module in the same folder aggregates the per-set unions into a combined `TraceableId` and exports the anchoring utility: `Traces<Id, T>` marks a type, `traces(id, value)` marks a value or function (the wrapping form, which binds the id to the value), and `verifies(id, run)` marks a test — each constrained to `TraceableId`.
- Because the markers are constrained to the union, deleting an id from the specs and regenerating makes every reference to it fail `tsc` (ADR-0001 D1) — existence is enforced by the type-checker, with no decorators and no custom compiler.
- The verbs mirror the relation vocabulary the specs use: production code `traces` an element; a test `verifies` it.
- The whole folder is deterministic and tool-owned (CON-012): re-running on unchanged specs is byte-identical, and a hand edit is overwritten.

This implements, for the TypeScript target, the generator contract the core depends on (ARCH-003); the Java generator does the same job with real annotations and an enum.

**Affected specs and artifacts**
- The `gen-typescript` package — its `Generator.generate` produces the per-set union files and the helper module of the generated folder, replacing the skeleton's single-file emission. The helpers are emitted, not shipped as a hand-written package.
- New `SW` spec for the TypeScript output contract — the generated folder's shape (per-set union files plus the helper module) and the anchoring helpers.
- Realizes/refines `ARCH-003` (generation behind the generator interface) and `SW-014` (generate traceables through the configured generators) for the TypeScript target.

**Acceptance Criteria**
- For each spec set, the generator emits one TypeScript file with a generated-do-not-edit header naming the spec set, and the set's ids as a union type.
- The generated folder also contains a helper module that aggregates the per-set unions into a combined `TraceableId` and exports `Traces<Id, T>`, `traces(id, value)`, and `verifies(id, run)`, each constrained to `TraceableId`; the helpers are generated, not a hand-written dependency.
- A reference to an id that is not in the generated union fails to type-check; removing an id from the specs and regenerating breaks every anchor to it.
- Re-running on unchanged specs produces byte-identical output.
- Vitest covers: the per-set union files; the helper module and combined union; that an anchor to a non-existent id is a type error; idempotency.

**Decisions** (resolved)
- **Spec strategy** — add a focused `SW` spec for the TypeScript output contract; `STR-011`'s "no language-specific spec" is scoped to the skeleton.
- **Helper location** — emitted into the generated folder in the consuming project, not shipped as a package and not placed in `core`. The helpers are TypeScript-specific consumer code and only need to be generated; the generator owns them exactly like the union files (CON-012).
- **Helper shape** — one shared `traces`/`verifies`/`Traces` over a combined `TraceableId`, per the design note, with the per-set unions still emitted as their own files (the reference's per-file structure).
- **Combined union** — emit a combined `TraceableId = SoftwareTraceableId | …` aggregating the per-set unions; the shared helpers are generic over it.

**Out of scope**
- Content-hash / drift checking — depends on the committed index (ADR-0001 D4/D6); a later concern.
- Deprecation marking (`@deprecated` on a withdrawn id) — the domain model does not yet carry a deprecation state; deferred until it does.
- The Java generator's output shape — its own work.
- The reverse, code-side coverage/scan command.

## Relations

**Realizes**

- [SW-018 — The TypeScript generator emits per-set union files and an anchoring helper module](../derived-specs/SW-018-typescript-output.md)

This story refines `ARCH-003` and `SW-014` for the TypeScript target and builds on the `spec` command skeleton (`STR-011`).
