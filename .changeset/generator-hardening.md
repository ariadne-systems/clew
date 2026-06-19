---
"@ariadne-thread/core": minor
"@ariadne-thread/gen-typescript": minor
"@ariadne-thread/gen-java": minor
---

Harden traceable generation (code-review fixes).

- `ariadne spec` now prunes the files it generated on a previous run that are no longer emitted — for example when an entire spec set is removed — so a deleted id stops compiling rather than lingering in a stale file (CON-012). Only files carrying the generated marker are removed; hand-written files are never touched.
- Generated symbol names are sanitized to valid identifiers via a shared core helper, so an unconstrained custom `specSets` name (even one starting with a digit) produces compilable output, and the TypeScript and Java generators name the same traceable identically (both derive it from the spec's filename).
- The TypeScript anchoring helpers (`traces`/`verifies`) now take a non-empty list of ids, so an empty anchor — which would silently assert nothing — is a compile error.
- The Java generator derives its `package` from the resolved output directory (so the file compiles where it lands) and shares the `@ariadne-thread` provenance banner; generators are now told their resolved output directory.
- An empty configured `outputDir` is treated as unset, falling back to the generator's default location.
