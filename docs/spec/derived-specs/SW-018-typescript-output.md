**Title**
The TypeScript generator emits per-set string enums and an anchoring helper module

**Lens**: SW

**Description**
For the TypeScript target, the generator emits a self-contained, tool-owned folder into its configured output directory (the generator's `outputDir`, ENT-002), which defaults to `src/ariadne/traceables` — under `src`, where the compiled, imported TypeScript source lives, since the generated files are part of the codebase.
For each spec set it emits one file — with a generated, do-not-edit banner carrying machine-readable `@ariadne-thread` provenance annotations (the homepage, the connector type `req-as-code`, the generator type, and the spec set) — declaring a string enum whose members are that set's traceables: each member's name is derived from the spec's filename, so it carries the id and slug and reads as documentation at the anchor site, and its value is the spec id, for example `SW_002_MINT_SEQUENTIAL_IDS = "SW-002"`.
It also emits a helper module that re-exports the per-set enums, unions them into a combined `TraceableId`, and exports the anchoring utility, each marker constrained to `TraceableId`: `Traces<Id, T>` marks a type, `traces` marks a value or function when called as `traces(ids, value)` and a class or method when applied as the decorator `@traces(ids)`, and `verifies(ids, run)` marks a test.
A code element may anchor to more than one spec: every marker takes a single member or a list, and members from different sets mix freely.
The helpers are generated, not a hand-written dependency.

**Rationale**
TypeScript's decorators apply only to classes and class members, so they cannot mark a type, a free function, or a test call; anchoring is therefore done with a generated string enum and type-constrained helpers, and the same `traces` is additionally exposed as a decorator for the class and method case where decorators do apply.
A reference to a member that no longer exists is a `tsc` error (ADR-0001 D1), with no custom compiler.
An enum rather than a bare union of id strings makes the anchor self-documenting at the call site — the member name carries the id and slug — and gives semantic go-to-definition and find-references across the codebase, which a string literal cannot; the cost is that renaming a spec (its file) renames the member and breaks its anchors, which is a deliberate prompt to re-validate.
A plain (non-`const`) enum is used so the output survives per-file transpilers and bundlers; the small runtime object it emits doubles as a ready list of ids.
Emitting one enum per spec set (SW-015) keeps each symbol set small and mirrors how the Java target groups its enums.

**Verification Description**
Given grouped spec sets, the generator produces one string-enum file per set, each carrying a generated-do-not-edit header, and one helper module that re-exports the enums and exports `Traces`, `traces` (as both a value wrapper and a class/method decorator), and `verifies` over a combined `TraceableId`.
An anchor to an existing member type-checks; an anchor to a member not in any enum — including any one of a list — is a type error, and removing a spec and regenerating drops its member, breaking every anchor to it.
Re-running on unchanged spec sets produces byte-identical files (CON-012).
