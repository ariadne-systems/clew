**Title**
The TypeScript generator emits per-set string enums and an anchoring helper module

**Lens**: SW

**Status**: active

**Description**
For the TypeScript target, the generator emits a self-contained, tool-owned folder into its configured output directory (the generator's `outputDir`, ENT-002), which defaults to `src/clew/traceables` — under `src`, where the compiled, imported TypeScript source lives, since the generated files are part of the codebase.
For each spec set it emits one file — with a generated, do-not-edit banner carrying machine-readable `@ariadne-thread` provenance annotations (the homepage, the connector type `req-as-code`, the generator type, and the spec set) — declaring a string enum whose members are that set's traceables: each member's name is derived from the spec's filename, so it carries the id and slug and reads as documentation at the anchor site, and its value is the spec id, for example `SW_002_MINT_SEQUENTIAL_IDS = "SW-002"`.
A member whose spec is `deprecated` (SW-014) carries a `/** @deprecated */` JSDoc comment, which `tsc` and editors surface as a deprecation on every anchor to it — a soft signal that the spec is retiring, without removing the member and breaking the build.
It also emits a helper module that re-exports the per-set enums, unions them into a combined `TraceableId`, and exports the anchoring utility, each marker constrained to `TraceableId`.
The markers express the three relations of the taxonomy (ADR-0004): `realizes` marks the code that **realizes** a spec — a value or function as `realizes(ids, value)`, a class or method as the decorator `@realizes(ids)`; `verifies(ids, run)` marks a test that **verifies** a spec; and `concerns`, in the same two forms as `realizes` (`concerns(ids, value)` or `@concerns(ids)`), marks code that **concerns** a spec — coupled to it, depending on or constrained by it, without realizing or verifying it.
The type markers `Realizes<Id, T>` and `Concerns<Id, T>` express realizes and concerns on a type, and anchor an interface through an `extends` clause (`interface I extends Realizes<ids, {}>`) or a sibling alias (ADR-0004 D5).
A code element may anchor to more than one spec: every marker takes a single member or a list, and members from different sets mix freely; at the type level several ids go in one list, never in stacked `extends` clauses.
The helpers are generated, not a hand-written dependency.
It also emits a `README.md` into the same folder documenting the markers and the form of each by the kind of element anchored, naming the relations but leaving their meaning to ADR-0004, so an author or agent can read how to anchor from beside the generated symbols rather than from a separate, driftable copy; the per-symbol documentation lives in the helper module as well.

**Rationale**
TypeScript's decorators apply only to classes and class members, so they cannot mark a type, a free function, or a test call; anchoring is therefore done with a generated string enum and type-constrained helpers, and `realizes` and `concerns` are each additionally exposed as a decorator for the class and method case where decorators do apply.
A reference to a member that no longer exists is a `tsc` error (ADR-0001 D1), with no custom compiler — this existence guarantee is the same for all three relations, so a `concerns` anchor cannot dangle even though, being a coupling rather than a behaviour, nothing exercises it (ADR-0004 D2).
An enum rather than a bare union of id strings makes the anchor self-documenting at the call site — the member name carries the id and slug — and gives semantic go-to-definition and find-references across the codebase, which a string literal cannot; the cost is that renaming a spec (its file) renames the member and breaks its anchors, which is a deliberate prompt to re-validate.
A plain (non-`const`) enum is used so the output survives per-file transpilers and bundlers; the small runtime object it emits doubles as a ready list of ids.
Emitting one enum per spec set (SW-015) keeps each symbol set small and mirrors how the Java target groups its enums.

**Verification Description**
Given grouped spec sets, the generator produces one string-enum file per set, each carrying a generated-do-not-edit header, one helper module that re-exports the enums and exports `Realizes` and `Concerns` (the type markers), `realizes` and `concerns` (each as both a value wrapper and a class/method decorator), and `verifies` over a combined `TraceableId`, and a `README.md` documenting those markers.
An anchor through any relation to an existing member type-checks; an anchor to a member not in any enum — including any one of a list — is a type error, and removing a spec and regenerating drops its member, breaking every anchor to it.
A member whose spec is deprecated carries a `@deprecated` JSDoc and stays in the enum, so its anchors still type-check.
Re-running on unchanged spec sets produces byte-identical files (CON-012).

## Relations

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)

## Changes

- **2026-06-26** — A member whose spec is `deprecated` (SW-014) is emitted with a `/** @deprecated */` JSDoc comment rather than dropped, so the symbol stays resolvable — anchors keep type-checking — while editors and `tsc` flag it as deprecated. Removing it would break every anchor's build the instant a spec is retired.
