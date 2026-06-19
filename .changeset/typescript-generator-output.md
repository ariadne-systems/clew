---
"@ariadne-thread/gen-typescript": minor
---

Emit the TypeScript generator's traceable output as per-set string enums plus a helper module (STR-014).

`ariadne spec` now generates, in the TypeScript generator's output directory, one file per spec set declaring a string enum whose members are that set's traceables — the member name carries the spec's id and slug (from its filename), the value is the id — with a generated-do-not-edit header naming the set, plus an `index.ts` helper module that re-exports the enums, unions them into a combined `TraceableId`, and exports `Traces`, `traces`, and `verifies` constrained to it; `traces` and `verifies` each accept one member or a list, so a code element can anchor to several specs, mixing sets freely.
An anchor to a member that no longer exists is a `tsc` error, so a spec removed from the project breaks every anchor to it — existence is enforced by the type-checker.
A plain (non-`const`) enum is used so the output survives per-file transpilers and bundlers, and its member names give self-documenting call sites and semantic find-references.
This replaces the skeleton's single-file emission; the output stays deterministic and tool-owned (re-running on unchanged specs is byte-identical).
