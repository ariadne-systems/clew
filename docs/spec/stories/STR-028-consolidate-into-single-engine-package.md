**Title**
Consolidate the engine, generators, and CLI into a single package behind the generator interface

**Business Value**
The tool ships as five packages — `core`, `cli`, `gen-java`, `gen-typescript`, `trace` — a shape whose only payoff is that a third party could add a generator without touching the core.
That payoff is not on the roadmap, and the split is not free: the CLI carries a composition-root that every command re-invokes, threading a `resolveGenerator` port through generation, scanning, coverage, and check; the CLI loads the built core, so a stale export in one command can take down unrelated ones.
Folding the engine, the two generators, and the CLI into one package removes that indirection and flattens the build, without giving up the polyglot capability — the generator interface stays as an internal seam, so a new language is still one implementation behind it.
The package then carries the product's name, `clew`, instead of `core` — a role name for a distinction the consolidation removes.

**Problem / Context**
ADR-0001 D9 made the core language-neutral and put each generator in its own package, with the rule that the core never depends on a concrete generator — a package boundary enforced in the build.
That boundary buys exactly one thing a single package cannot: out-of-tree extensibility.
The engine has a single consumer, the `clew` CLI; the two generators are in-tree and maintained together; no third-party generator exists.
TypeScript has no service-provider mechanism like Java's `ServiceLoader`, so even a "properly decoupled" generator system here would be a fragile side-effect-import scheme or a config-named dynamic import that forgoes bundling — machinery justified only by third-party providers.
ADR-0007 records the decision to fold the packages together, keep the interface as an internal seam, and defer — without foreclosing — third-party generators.
The specs that encoded D9 have already been revised for this: SYS-008, ARCH-003, ARCH-004, SW-014, SW-019, SW-022, and the softened STK-008.

**Solution Approach**
- Consolidate `gen-java`, `gen-typescript`, and the CLI into a single package, `@ariadne-thread/clew`.
The generators become in-tree modules; the CLI becomes the package's presentation layer and bin.
`@ariadne-thread/core` retires as a package name — the surviving package takes the product name.
The bin stays `clew`; `@ariadne-thread/trace` stays a separate package, because it holds generated output and folding it into the code that generates it tangles a bootstrap.
- Keep the `Generator` interface (ARCH-003 / ARCH-004 / ARCH-006) exactly as it is, now an internal boundary rather than a package one.
The engine's generation-agnostic logic — generation, scanning, coverage, check — still reaches every generator through the interface, never into a concrete generator's internals.
The concrete generators are bound at a single registry point; that one file is where the engine names them, and nowhere else.
- Replace the compile-enforced D9 boundary test with a softer internal architecture test: the generation-agnostic modules import only the interface and the registry, and the CLI layer is the only place touching `process` / stdout / argument parsing.
- Third-party generators stay deferred.
The interface being preserved keeps the future path — a config-named dynamic import for unknown generator names — an additive change rather than a rewrite.
- The change is behaviour-preserving: generator output must not move.

**Acceptance Criteria**
- The workspace has two packages: `@ariadne-thread/clew` (engine, generators, and the `clew` bin) and `@ariadne-thread/trace`; `core`, `cli`, `gen-java`, and `gen-typescript` no longer exist as packages.
- The `Generator` interface is unchanged, and the generation-agnostic logic reaches generators only through it; the concrete generators are bound at a single registry point.
- Adding a target language is a new in-tree generator implementing the contract plus one registration, with no other change to the engine.
- `clew spec`, `clew scan`, and `clew coverage` behave as before; regenerating this repo's own traceables (`clew spec`) produces no diff — the TypeScript output is byte-identical and every existing anchor still resolves.
- The architecture test enforces the softer internal rule (generation-agnostic modules import only the interface and the registry; the CLI layer alone touches process / stdout / argument parsing).
- `004-technology-contract.md` and `docs/spec/architecture.md` describe the two-package structure.
- The moved tests run under the consolidated package and pass; no test semantics change (a behaviour-preserving refactor).

**Out of scope**
- Third-party / out-of-tree generators and any dynamic-import loader — deferred by ADR-0007, not built here.
- Any change to a generator's output or to the generator contract (ARCH-003 / ARCH-004 / ARCH-006) — the interface and the emitted code are untouched.
- The id-generation strategy seam (ARCH-001) — a different boundary, unchanged.
- The `trace` package — unchanged.
- A wider brand or scope rename — the scope stays `@ariadne-thread`.

## Relations

**Realizes**

- [SYS-008](../specs/SYS-008-language-neutral-extensibility.md)

**Related**

- Implements the revised [ARCH-003](../specs/ARCH-003-generator-interface.md) and [ARCH-004](../specs/ARCH-004-generator-discovers-markers.md) — the interface kept as an internal seam, generators bound at a single registry point.
- Carries out the revisions to [SW-014](../specs/SW-014-generate-traceables.md), [SW-019](../specs/SW-019-resolve-configuration.md), and [SW-022](../specs/SW-022-scan-code-into-anchor-locations.md) — generation, resolution, and scan now reach the in-tree generators through the interface and the registry.
- Softens [STK-008](../specs/STK-008-polyglot-applicability.md) — the polyglot need is unchanged; its verification no longer pins the mechanism.
- Records the decision in ADR-0007 (in-tree generators, single engine package), which revises ADR-0001 D9.
