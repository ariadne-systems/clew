# @ariadne-thread/trace

## 0.2.0

### Minor Changes

- 7f53466: Add the code-anchor scan and the `clew scan` command (STR-016) — the check-side dual of generation (ADR-0005).

  The generator interface gains a `discover` operation beside `generate`: the generator that emits a language's markers now also finds them in source.
  The TypeScript generator implements it as a region-aware lexical scan that ignores comments, strings, template literals, and regex literals, reads only the leading id argument bracket-aware, and derives the spec id from the member name with no lookup into the generated definitions.
  The core drives each configured generator's discover through the interface, applies built-in exclusions (dependency, build, and generator-output directories), and aggregates the anchor locations, sorted and deterministic.
  `clew scan` reports the anchors and writes the locations index atomically, in the shared `locations.json` shape.

  This adds the required `Generator.discover` and `Generator.sourceExtensions` members, which every generator must implement — a breaking change to the generator contract, taken before release.

- d6b316f: Add configurable scan exclusion — `exclude` and `unexclude` in `.clewrc.json` (STR-017).

  The code scan now reads two glob arrays from configuration and applies them alongside the built-in defaults, which become repository-root-relative globs.
  A bare segment matches only at the root, a leading `**` matches at any depth, and matching is case-sensitive — so a source directory whose name collides with a build convention is no longer dropped wherever it appears.
  Precedence is gitignore-style: a user `exclude` wins, an `unexclude` re-includes a path a built-in default would drop, and a user `exclude` is absolute.
  Exclusion is applied during the walk, before discovery, so an excluded file is never read and an excluded directory is pruned — unless an `unexclude` reaches a path beneath it.
  Every pattern is compiled up front; an uncompilable `exclude` or `unexclude` glob fails the scan with the new `E_INVALID_EXCLUSION_PATTERN` error rather than silently matching nothing.

- f95d8fb: Add a class/method decorator form of `realizes`, and move the generated traceables into the `@ariadne-thread/trace` package.

  The TypeScript generator now emits `realizes` as an overload: `realizes(ids, value)` still wraps a value or function, and `realizes(ids)` returns a no-op decorator so a class or method can be anchored as `@realizes(ids)` rather than wrapped. This is the natural marker for classes, which the value form cannot mark cleanly.

  The generated traceables and anchoring utility live in their own workspace package, `@ariadne-thread/trace`, rather than inside the engine — keeping the generated surface out of the engine's public API is why it is a dedicated package. `@ariadne-thread/clew` depends on `@ariadne-thread/trace` for its anchors (for example `SequentialIdStrategy` carries `@realizes(SwTraceables.SW_002_MINT_SEQUENTIAL_IDS)`).

  The decorator is emitted in the TypeScript experimental-decorator form (`experimentalDecorators` is enabled project-wide), because the project's build (rolldown/tsdown) and test (oxc) toolchains lower experimental decorators but leave standard TC39 decorators as raw syntax. The marker is inert at runtime, so the legacy semantics are immaterial; this avoids adding a separate transformer such as SWC.
