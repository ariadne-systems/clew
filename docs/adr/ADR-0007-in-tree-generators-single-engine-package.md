# ADR-0007: In-tree generators — a single engine package behind the generator interface

- Status: Accepted.
- Date: 2026-07-08
- Deciders: project maintainer.
- Revises: ADR-0001 D9 (language-neutral core with pluggable generators).
- Revises specs: SYS-008 (language-neutral extensibility), ARCH-003 (generator interface); softens STK-008 (polyglot applicability) verification.

## Context

ADR-0001 D9 split the system into a language-neutral core plus one generator package per language (`gen-java`, `gen-typescript`), under the rule that the core depends on the generator interface and never on a concrete generator — declared "the most important architectural boundary."

Two facts about the project as it actually stands press against that split.

First, the engine has a single consumer — the `clew` CLI — and no second consumer is planned.

Second, the two generators are in-tree and maintained together.
No third-party generator exists, and none is on the roadmap.

The D9 package boundary buys exactly one thing a single-package design cannot: a third party can ship a generator without modifying — or even seeing — the core.
Everything else attributed to the split is achievable with the interface alone: adding a language is one registration line either way; the generators remain independently testable as modules; the core stays decoupled from language specifics through the interface.
The package boundary adds only out-of-tree extensibility on top of that.

The split is not free.
The CLI carries a composition-root role (`cli/generators.ts`) that every command re-invokes, threading a `resolveGenerator` port through `spec`, `scan`, `coverage`, and `check`.
The CLI loads the built core, so a stale export in one command once took down unrelated commands.
And placing the registry at the composition root adds a layer of indirection whose only benefit — out-of-tree extensibility — the project does not use.

TypeScript has no service-provider mechanism analogous to Java's `ServiceLoader`: nothing discovers installed providers without either a static import or a config-named dynamic import.
So even a "properly decoupled" generator system here would be a fragile side-effect-import scheme (fighting `sideEffects: false` and tree-shaking) or a config-named dynamic import that forgoes bundling — machinery justified only by third-party providers.

The decoupling's sole real payoff is third-party generators, which is not a roadmap goal.
Buying it now would mean committing to a supported, published generator API and executing third-party code — costs that come due only when someone outside the tree actually ships a generator.

## Decision

### D1 — One engine package, named for the product

`gen-java`, `gen-typescript`, and the engine consolidate into a single package: `@ariadne-thread/clew`, the existing CLI package, which now carries the engine beside its presentation layer.
The generators become in-tree modules (`clew/src/generators/{typescript,java}`).

`@ariadne-thread/core` retires as a package name.
"Core" described a role — the language-neutral engine *behind* a thin CLI and pluggable generators — and this ADR dissolves that role, so the surviving single package takes the product's name, Clew.
The bin stays `clew`; the scope stays `@ariadne-thread`.
Nothing imports the engine as a library once the generators fold in, so there is no import-stability reason to keep the old name.

The system goes from five packages to two: `clew` (engine and bin) and `trace` (generated traceables).

Terminology.
The rest of this ADR calls the language-neutral layer "the engine" (what was the `core` package); it now ships inside `clew`.

### D2 — The generator interface stays, as an internal seam

The `Generator` contract (ARCH-003, ARCH-004, ARCH-006) is kept as is — now an internal boundary rather than a package boundary.
Generation, discovery, and comment identification still go through it, and the engine's generation-agnostic logic (`spec`, `scan`, `coverage`, `check`) still depends only on the interface, never reaching into a concrete generator's internals.
What changes is only this: the concrete generators are resolved from an in-package registry that names them directly, so the engine references the concrete generators at exactly one point — the registry — and nowhere else.

Rationale.
The interface is the option value.
It keeps generation decoupled from the rest of the core, keeps a new language to one implementation, and leaves the third-party path (D3) available as an additive change rather than a rewrite.

### D3 — Third-party generators are deferred, not foreclosed

The single-package design neither commits the project to third-party generators nor prevents them.
If out-of-tree providers become a goal, the additive path is a config-named dynamic import — the TypeScript-idiomatic equivalent of an SPI, as ESLint, Vite, and Prettier resolve plugins: built-in generators compiled in, an unknown configured name resolved by `await import()` of its package specifier.
That step, and only that step, brings the bill this ADR declines to pay now: a stable `Generator` API published and supported under semver, runtime validation of loaded modules, and the trust surface of executing configured third-party code.

### D4 — `trace` stays a separate package

`@ariadne-thread/trace` is not folded in.
It holds generated output — the project's own traceables, produced by running `clew` on its own specs — and the core imports it for its anchors.
Folding generated output into the code that generates it tangles a bootstrap; `trace` is a pure leaf with no cost to keeping it separate.
Its separation is unrelated to the generator decision and unaffected by it.

## Relationship to existing specs

This ADR reverses part of ADR-0001 D9, so it revises the specs that encode D9.
These are `active` specs: the code change contradicts them until they are revised, and each revision carries a `## Changes` entry.
This is the point at which the decision stops being a file move and becomes a governed change.

- **SYS-008 (language-neutral extensibility)** — the promise "no language assumption in the core; adding a language is not a core change; the core references no concrete generator" no longer holds.
Revised to: the system supports multiple target languages through generators behind a narrow interface; adding a language is one in-tree generator implementing that interface, plus one registration.
The polyglot capability stands; the "no core change" guarantee does not.
- **ARCH-003 (generator interface)** — the clause "the core depends on the generator interface, never on a concrete generator" is dropped.
The interface, and everything else in the spec, stands.
Revised to state that the core reaches every generator through the interface and binds the concrete in-tree generators at a single registry point.
- **STK-008 (polyglot applicability)** — the stakeholder need is unchanged and still met.
Only its verification wording "without the core changing" is softened; a stakeholder need should not have pinned the mechanism.

## Consequences

Positive.
Two packages instead of five; the dependency graph and build order flatten, and the stale-built-core footgun disappears.
The CLI becomes what the technology contract always claimed — presentation only — with no composition root and no `resolveGenerator` port threaded through the core's functions.
Adding an in-house language is still one implementation behind the interface.

Negative and risks.
The engine is no longer language-agnostic at the package level; `clew` names its generators.
The compile-enforced D9 boundary is gone, replaced by a softer internal rule — an architecture test that the generation-agnostic modules import only the `Generator` interface and the registry, never a concrete generator's internals.
Third-party generators become a future project with a real bill (D3), not a property gained for free by installing a package; if out-of-tree extensibility matters sooner than expected, some of this is re-work — bounded, because the interface survives.

Reversibility.
The interface seam (D2) is what keeps this cheap to revisit.
Re-splitting into packages, or adding the dynamic-import path, is additive work on top of a preserved contract, not a teardown.
