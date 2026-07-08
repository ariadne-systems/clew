---
"@ariadne-thread/clew": minor
"@ariadne-thread/trace": minor
---

Add a class/method decorator form of `realizes`, and move the generated traceables into the `@ariadne-thread/trace` package.

The TypeScript generator now emits `realizes` as an overload: `realizes(ids, value)` still wraps a value or function, and `realizes(ids)` returns a no-op decorator so a class or method can be anchored as `@realizes(ids)` rather than wrapped. This is the natural marker for classes, which the value form cannot mark cleanly.

The generated traceables and anchoring utility live in their own workspace package, `@ariadne-thread/trace`, rather than inside the engine — keeping the generated surface out of the engine's public API is why it is a dedicated package. `@ariadne-thread/clew` depends on `@ariadne-thread/trace` for its anchors (for example `SequentialIdStrategy` carries `@realizes(SwTraceables.SW_002_MINT_SEQUENTIAL_IDS)`).

The decorator is emitted in the TypeScript experimental-decorator form (`experimentalDecorators` is enabled project-wide), because the project's build (rolldown/tsdown) and test (oxc) toolchains lower experimental decorators but leave standard TC39 decorators as raw syntax. The marker is inert at runtime, so the legacy semantics are immaterial; this avoids adding a separate transformer such as SWC.
