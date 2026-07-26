**Title**
Generation is delegated to language-specific generators behind a narrow interface

**Lens**: ARCH

**Status**: active

**Description**
Emitting the traceables and the anchoring utility for a target language is the job of a language-specific generator, chosen by configuration and implemented behind a narrow interface.
Given the traceables, grouped into the configured spec sets (by lens by default), a generator produces the verifiable symbols — one set per spec set — and the utility that anchors code to a spec, and defines how code references a symbol.
The core uses generators only through this interface, never reaching into a concrete generator's internals; the concrete generators live in-tree, bound at a single registry point (ADR-0007).
The same interface also carries the dual operation — discovering those markers back out of source — so generation and discovery are two operations of one contract (ARCH-004; ADR-0005 D2).
Because identifying a comment is the same per-language lexical knowledge as discovering a marker, the interface also carries comment identification — classifying a source into its code and comment regions — so the spec-id-in-comment check reads comments through the generator's own lexer rather than a separate one (ARCH-006).

**Rationale**
Keeping language knowledge behind a narrow contract keeps generation decoupled from the rest of the core and keeps the cost of a new language down to one implementation behind the interface.
Comment syntax is part of that same per-language knowledge, so it lives in the generator beside discovery — one lexer classifies code and comments for both, rather than the core maintaining a second, weaker comment scanner.
This is the same shape as the id-generation strategy seam (ARCH-001), but for language emission rather than the id's variable part — a sibling boundary, not a replacement.

**Verification Description**
With a generator configured, generation runs through the interface.
The core uses generators only through the interface, binding the concrete ones at a single registry point.
Adding a target language is a new generator implementing the contract — generation, discovery, and comment identification — plus its registration.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-008](SYS-008-language-neutral-extensibility.md)

**Related**

- [ARCH-006](ARCH-006-pluggable-comment-finders.md) — comment identification is one operation of this contract, beside generation and discovery.

## Changes

- **2026-06-29** — Added comment identification to the generator contract: a generator classifies its language's source into code and comment regions, so the spec-id-in-comment check reads comments through the generator's own lexer (ARCH-006) instead of a separate core-owned one.
Discovery and comment identification are the same per-language lexical knowledge, so they belong to one interface.
- **2026-07-08** — Revised for ADR-0007, which folds the in-tree generators into the core.
Dropped the clause that the core depends on the interface and never on a concrete generator as an unerodable package boundary; the interface itself is unchanged, but the concrete generators are now in-tree, bound at a single registry point rather than resolved from separate packages.
Generation, discovery, and comment identification remain one contract.
