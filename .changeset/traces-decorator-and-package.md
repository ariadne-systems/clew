---
"@ariadne-thread/gen-typescript": minor
"@ariadne-thread/trace": minor
"@ariadne-thread/core": minor
---

Add a class/method decorator form of `traces`, and move the generated traceables into the `@ariadne-thread/trace` package.

The TypeScript generator now emits `traces` as an overload: `traces(ids, value)` still wraps a value or function, and `traces(ids)` returns a no-op decorator so a class or method can be anchored as `@traces(ids)` rather than wrapped. This is the natural marker for classes, which the value form cannot mark cleanly.

The generated traceables and anchoring utility now live in their own workspace package, `@ariadne-thread/trace`, instead of inside `core`. Anchoring production code across several packages needs one importable home for the generated symbols; a dedicated package provides it without forcing the generated surface onto `core`'s public API. Every package that anchors its code depends on `@ariadne-thread/trace`; `core` is the first (its `SequentialIdStrategy` carries `@traces(SwTraceables.SW_002_MINT_SEQUENTIAL_IDS)`).

The decorator is emitted in the TypeScript experimental-decorator form (`experimentalDecorators` is enabled project-wide), because the project's build (rolldown/tsdown) and test (oxc) toolchains lower experimental decorators but leave standard TC39 decorators as raw syntax. The marker is inert at runtime, so the legacy semantics are immaterial; this avoids adding a separate transformer such as SWC.
