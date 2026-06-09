# ADR-0001: Compile-checked, ID-anchored traceability as agent context

- Status: Accepted (core decisions); open questions listed at the end.
- Date: 2026-06-07
- Deciders: Thorsten (solo).
- External input: the approach was reviewed with Vlad Khononov, who found it coherent. This is context, not a decision authority.

## Context

The goal is tooling that makes the dogfooded SRDD approach reusable beyond the Ariadne codebase.

Agentic coding makes code cheap to produce.
The binding problem is keeping generated code aligned with intent over time, and giving the agent scoped, current context for the next change.

Two failure modes drive this work.
Spec rot: the spec and the code drift apart, and the spec degrades into stale documentation that misrepresents the system.
Reinvention: the agent re-implements something that already exists because it has no reliable map of what exists.

Existing spec-driven approaches (spec-kit, Kiro, SPDD) keep the spec-to-code link at the document or agent level.
Alignment is re-derived or checked by an agent, not mechanically enforced.

The decision is to make the requirement-to-code link mechanical, and to reuse that same link as the agent's context source.

The mechanism is language-neutral; it supports arbitrary target languages through pluggable generators.
Java and TypeScript are the first two generators, and both already exist.
Distribution is aimed at npm.

## Decision

A traceable spec element is bound to code by a generated symbol that the target language's type-checker can verify.
The language-neutral core anchors and resolves; language-specific generators materialize the symbols.
The link is reused, via an index and resolver, to supply the agent with scoped context.
The following constituent decisions define how.

### D1 — Link direction and enforcement

The trace lives in the code and references a stable spec-element ID.
Existence is enforced by the target language's type-checker, where one exists: a language-specific generator emits one verifiable symbol per element ID, the code references it, and a missing element removes the symbol so the code no longer compiles.
Where the target language has no type-checker, existence falls back to a dedicated build check (see D9).
Content change is a separate check: the code stores the content-hash it was anchored against, and a check step compares it to the current hash and fails on mismatch.

Rationale.
Existence and content-currency are two different properties; the type-checker can see the first but not the second.
The build is the harness; drift surfaces mechanically instead of being noticed by a reviewer or an agent.

Rejected alternatives.
Storing the link in the spec document: a document reference to code is not compile-checkable and rots when code moves.
Storing a location or URL in the code: a location is not identity and drifts when the element moves.
Relying on an agent to re-check alignment: this is the status quo the work improves on.

### D2 — Element identity

Each traceable element carries a stable, element-owned ID as a token embedded in its content.
Identity is independent of document position and of heading text.

The ID form is a readable prefix plus a short opaque suffix.
The prefix carries meaning (which spec, which element type); the suffix carries uniqueness.

Rationale.
Position numbering and heading slugs both shift, so neither can serve as identity.
A purely sequential number implies an ordering, which is exactly the positional meaning that was rejected.
The opaque suffix removes collisions without claiming an order that does not exist.

Rejected alternatives.
Positional or sequential-only IDs: fragile and misleading.
Markdown heading anchors: text-derived, too coarse, and they do not reach list items, where most traceables sit.
Purely opaque IDs: collision-free and stateless but not human-readable.

### D3 — ID assignment

IDs are minted by a CLI according to a pattern.
The spec-authoring skill calls the CLI; the scanner only recognizes existing IDs and never mints.
A verify mode compares the token set before and after a change and flags lost or duplicated IDs.

Rationale.
Identity is assigned, not inferred.
Inferring identity from unmarked content is the matching problem and reintroduces guessing.

Note.
With the prefix-plus-opaque-suffix form, minting needs no central ledger and survives branching.
A readable-sequential scheme would require a committed highwater value or ID ledger and a merge-collision strategy.

### D4 — Index and resolution

A derived index maps each ID to its current locator and content-hash, committed alongside the code.
Resolution is by ID in one hop, addressed by an ID-keyed URL, not by full-text search.

Rationale.
Identity and location are different concerns; the ID is durable, the location is looked up.
A location-keyed URL would reintroduce drift; an ID-keyed URL stays stable because the resolver, not the URL, knows the current location.

The index is derived and rebuildable.
It is a cache, not the source of truth.
The truth is the tokens in the artifacts plus the traces in the code; if the index is lost, it is rebuilt from them.

### D5 — Tooling runtime

The scanner, generators, resolver, and CLI are Node-based and distributed via npm.
Each generator emits source in its target language; the target project's own type-checker then verifies it.
The tool only writes text and runs no language runtime of its own (no JVM, no language-specific toolchain on the tool side).

Rationale.
Node reaches target projects across languages at the lowest entry barrier, while a per-language CLI would reach only one ecosystem.
Enforcement is borrowed from the target language's type-checker, not reimplemented; the tool stays a text generator.

Limitation.
The compile-time guarantee depends on the target language having a type-checker (for example javac for Java, tsc for TypeScript).
For a dynamic, untyped target the guarantee falls back to a dedicated build check rather than a compile error (see D9).

### D6 — Completeness enforcement (reverse direction)

A catalog traceable requires a catalog marker in the code, and a catalog marker requires a corresponding traceable.
A language-specific check enforces both directions and fails the build on violation; in Java this is an ArchUnit test, in another language it is the equivalent for that ecosystem.
This check belongs to the language's generator (see D9), since both the marker and its enforcement differ per language.

Rationale.
The compiler enforces the forward direction, declared-then-implemented.
It cannot see the reverse, implemented-but-not-declared, because it does not know that a class is a service.
The reinvention goal needs completeness, which is exactly the reverse direction.

Residual.
The mechanism enforces consistency between annotation and traceable, not that the annotation is applied at all.
Closing that last gap would require a structural rule (package, interface, or stereotype) and is deferred until unannotated elements prove to be a real problem in practice.
This is consistent with not building a do-everything-right tool: the mechanism lowers the chance of error and makes error loud, and review remains responsible for the rest.

### D7 — Document structure of the native method

Low-volatility, cross-cutting knowledge is kept central: entity model, architecture, service registry, utility registry.
Story-specific intent is kept per-story as requirements.

The truth direction differs by document.
Entity model and architecture are spec-led: design precedes code.
Service and utility registries are declared in the spec, before or with implementation, and anchored, so the registry expresses intended and existing elements and the agent does not reinvent.
All central elements are anchored and compile-checked by the same mechanism, so none can rot silently.

Context assembly has two modes.
Anchor-driven: touched code resolves to the requirements anchored to it.
Registry-driven: the services and utilities that already exist, loaded at planning time so existing elements are reused rather than recreated.

### D8 — Generalization and scope

A config/schema layer makes the mechanism approach-agnostic by describing where the artifacts are and which elements are traceable.
The native method ships as an opinionated template, not a blank schema, because the coherence is the value.

Fit follows Boeckeler's taxonomy.
Spec-anchored is the sweet spot: durable code, durable spec, the compile-checked trace holds them together.
Spec-first in the throwaway sense has no durable artifact to anchor.
Spec-as-source dissolves the durable code side that the mechanism binds to.

Foreign approaches are consumers, not competitors.
Integration means calling the mint CLI from the foreign authoring step to embed the token; the same single minting path serves native and foreign specs.
SPDD is the first candidate, since openspdd is open and its authoring step is reachable.

### D9 — Language-neutral core with pluggable generators

The core knows no target language.
It deals only in traceables, IDs, the index, hashes, and resolution, all of which are language-neutral text processing.
Language knowledge lives entirely in generators, one per target language, behind a narrow interface.

A generator implements a defined contract.
Given the set of traceable IDs, it produces verifiable symbols in its language and defines how code references a symbol.
The reverse-direction completeness check from D6 is part of the same contract, because the catalog marker and its enforcement differ per language.

The package structure follows this split: a language-neutral core package, and one generator package per language (for example core, gen-java, gen-typescript).
The core depends on the generator interface, never on a concrete generator.
This is the most important architectural boundary and is enforced in the build, the equivalent of the existing ArchUnit boundary rules.

Java and TypeScript are the first two generators and already exist.
Adding a language means implementing the generator contract, not changing the core.

The enforcement promise is therefore stated in three layers.
The core anchors IDs language-neutrally.
A language-specific generator materializes them as verifiable symbols.
Existence is enforced by the target language's type-checker where one exists, and by a dedicated build check otherwise.

Rationale.
Supporting arbitrary languages requires that no language assumption leak into the core.
A narrow generator contract keeps the cost of a new language to one implementation.

## Consequences

Positive.
Drift is surfaced mechanically: existence by the target language's type-checker (or a build check where there is none), content by the hash check, completeness by a language-specific reverse check (ArchUnit in Java).
The same anchors serve as scoped, current agent context, so traceability pays for itself on every change.
There is one minting path for native and foreign specs, and one runtime (Node) that borrows enforcement from the target.

Scope of the guarantee.
The mechanism guarantees structural consistency and traceability, not functional correctness.
Behaviour remains the job of tests and review; this is the part Boeckeler calls the behaviour problem and the mechanism does not close it.

Negative and risks.
Each foreign-approach adapter is maintenance surface against a moving target, which is costly for a solo maintainer.
The value is clearest in slow, conservative, regulated markets, while easy distribution sits with the fast hype crowd; these are two funnels that overlap little.
The idea is graspable and is not itself a moat; the moat is origin, domain depth, and reputation.

## Architectural consequence for the free/paid boundary

Recorded as a technical consequence, not a pricing decision.

The mechanism runs fully locally when the spec lives in the repo: scanner, committed index file, generator, resolver, and the target compiler, on a single repo and single stack, with no server.

A central authority becomes necessary only when uniqueness or identity must be guaranteed across a boundary a per-repo file cannot cover.
Those cases are parallel branches with real minting load, multiple repos against a shared source, an external ALM as source, or a readable-sequential scheme with a global ledger.

That central authority is where a server is technically required.
The free, local variant therefore uses opaque-suffix IDs and a local index, which cannot collide silently.

## Open questions

Token preservation on update.
The spec-authoring skill must carry an existing token forward when it rewrites an element.
Whether to enforce this preventively, by editing fields without touching the token field, or only to catch it after the fact via the verify mode, is unresolved.

Readable-sequential support.
Whether to offer readable-sequential IDs, with the required ledger and merge strategy, in addition to the prefix-plus-suffix default.

Reachability of foreign authoring steps.
For a foreign approach, whether the authoring step is reachable to inject the mint CLI.
Open tools allow this; closed IDE products may allow only a post-pass, which reintroduces the matching problem.

Generator interface surface.
The minimal contract a generator must implement is not yet fixed.
It includes at least symbol generation, a reference convention, and the reverse-direction catalog check; whether anything else belongs in it is open, and the contract should be kept as narrow as possible.

## References

- B. Boeckeler, spec-driven development taxonomy: spec-first, spec-anchored, spec-as-source (martinfowler.com).
- Structured-Prompt-Driven Development (SPDD), the REASONS Canvas, and openspdd; example codebase token-billing.
- Internal: Ariadne / io.declareq.trace; ArchUnit CodingConventionsArchitectureTest.
