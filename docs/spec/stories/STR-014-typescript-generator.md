**Title**
Emit the TypeScript generator's traceable output — per-set string enums and anchoring helpers

**Business Value**
The skeleton TypeScript generator emits one placeholder file; this defines the real output — the means by which TypeScript code anchors to a spec id with existence enforced by `tsc`, the equivalent of the Java annotation referencing a generated enum.
Without it the TypeScript target has no working compile-checked trace, so the tool's core promise does not reach a TypeScript codebase.

**Problem / Context**
TypeScript has no annotation that can mark a `type`, a free function, or a `test(...)` call: decorators are a runtime construct that applies only to classes and their members, which is not where most code lives.
The skeleton generator (STR-011) emits the symbols and helpers in a single throwaway file as a first working emission.
We need the generator's full, documented output: one generated file per spec set — structured like the reference Java/TypeScript traceable files (a generated-do-not-edit header, the set's symbols) — built on a mechanism that makes a removed id a compile error.

**Solution Approach**
Running `clew spec` generates a self-contained folder in the project — tool-owned, regenerated, never hand-edited — holding both the symbols and the means to anchor against them.
The helpers are *emitted*, not shipped: nothing lives in the tool's codebase as a hand-written package, and the consuming project imports only generated code.
The mechanism is a generated string enum per set plus type-constrained helpers, checked by `tsc` — not decorators:

- Per spec set, the generator emits one file with a "generated — do not edit" header carrying its provenance, declaring a string enum whose members are the set's traceables — the member name derived from the spec's filename (so it carries the id and slug, readable at the anchor site), the value the spec id — for example `SW_002_MINT_SEQUENTIAL_IDS = "SW-002"` (a plain enum, not a `const enum`, and one enum per set, not a flat list).
- A generated helper module re-exports the per-set enums, unions them into a combined `TraceableId`, and exports the anchoring utility: `Realizes<Id, T>` marks a type, `realizes(ids, value)` marks a value or function, and `verifies(ids, run)` marks a test — each constrained to `TraceableId` and taking one member or a list.
- Because the markers are constrained to that union, deleting a spec and regenerating drops its enum member, so every reference to it fails `tsc` (ADR-0001 D1) — existence is enforced by the type-checker, with no decorators and no custom compiler.
- The verbs mirror the relation vocabulary the specs use: production code `realizes` an element; a test `verifies` it.
- The whole folder is deterministic and tool-owned (CON-012): re-running on unchanged specs is byte-identical, and a hand edit is overwritten.

This implements, for the TypeScript target, the generator contract the core depends on (ARCH-003); the Java generator does the same job with real annotations and an enum.

**Affected specs and artifacts**
- The `gen-typescript` package — its `Generator.generate` produces the per-set enum files and the helper module of the generated folder, replacing the skeleton's single-file emission. The helpers are emitted, not shipped as a hand-written package.
- New `SW` spec for the TypeScript output contract — the generated folder's shape (per-set enum files plus the helper module) and the anchoring helpers.
- Realizes/refines `ARCH-003` (generation behind the generator interface) and `SW-014` (generate traceables through the configured generators) for the TypeScript target.

**Acceptance Criteria**
- For each spec set, the generator emits one TypeScript file with a generated-do-not-edit header naming the spec set, declaring a string enum of that set's traceables (member name from the filename, value the id).
- The generated folder also contains a helper module that re-exports the per-set enums into a combined `TraceableId` and exports `Realizes<Id, T>`, `realizes(ids, value)`, and `verifies(ids, run)`, each constrained to `TraceableId` and taking one member or a list; the helpers are generated, not a hand-written dependency.
- An anchor to a member not in any enum fails to type-check; removing a spec and regenerating breaks every anchor to it.
- Re-running on unchanged specs produces byte-identical output.
- Vitest covers: the per-set enum files; the helper module and combined union; that an anchor to a removed member is a type error; idempotency.

**Decisions** (resolved)
- **Spec strategy** — add a focused `SW` spec for the TypeScript output contract; `STR-011`'s "no language-specific spec" is scoped to the skeleton.
- **Helper location** — emitted into the generated folder in the consuming project, not shipped as a package and not placed in `core`. The helpers are TypeScript-specific consumer code and only need to be generated; the generator owns them exactly like the enum files (CON-012).
- **Helper shape** — one shared `realizes`/`verifies`/`Realizes` over a combined `TraceableId` (the union of the per-set enums), each taking one member or a list, with the per-set enums emitted as their own files.
- **Symbol form** (revised) — the per-set symbols are a plain string **enum**, not a string-literal union. The enum makes anchors self-documenting at the call site (the member name carries the id and slug) and gives semantic go-to-definition and find-references, at the cost of an anchor breaking when a spec is renamed — a deliberate prompt to re-validate. A plain (non-`const`) enum is used so the output survives per-file transpilers and bundlers (tsx, esbuild, tsdown). This supersedes the earlier "a union, not a `const enum`" choice.

**Out of scope**
- Content-hash / drift checking — depends on the committed index (ADR-0001 D4/D6); a later concern.
- Deprecation marking (`@deprecated` on a withdrawn id) — the domain model does not yet carry a deprecation state; deferred until it does.
- The Java generator's output shape — its own work.
- The reverse, code-side coverage/scan command.

## Relations

**Realizes**

- [SW-018 — The TypeScript generator emits per-set string enums and an anchoring helper module](../derived-specs/SW-018-typescript-output.md)

This story refines `ARCH-003` and `SW-014` for the TypeScript target and builds on the `spec` command skeleton (`STR-011`).
