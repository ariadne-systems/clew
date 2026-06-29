**Title**
Generation is delegated to language-specific generators behind a narrow interface

**Lens**: ARCH

**Status**: active

**Description**
Emitting the traceables and the anchoring utility for a target language is the job of a language-specific generator, chosen by configuration and implemented behind a narrow interface.
Given the traceables, grouped into the configured spec sets (by lens by default), a generator produces the verifiable symbols — one set per spec set — and the utility that anchors code to a spec, and defines how code references a symbol.
The core depends on the generator interface, never on a concrete generator; this is the boundary that must not erode (ADR-0001 D9).
The same interface also carries the dual operation — discovering those markers back out of source — so generation and discovery are two operations of one contract (ARCH-004; ADR-0005 D2).
Because identifying a comment is the same per-language lexical knowledge as discovering a marker, the interface also carries comment identification — classifying a source into its code and comment regions — so the spec-id-in-comment check reads comments through the generator's own lexer rather than a separate one (ARCH-006).

**Rationale**
Supporting arbitrary target languages requires that no language assumption leak into the core.
A narrow generator contract keeps the cost of a new language down to one implementation, with no change to the core.
Comment syntax is part of that same per-language knowledge, so it lives in the generator beside discovery — one lexer classifies code and comments for both, rather than the core maintaining a second, weaker comment scanner.
This is the same shape as the id-generation strategy seam (ARCH-001), but for language emission rather than the id's variable part — a sibling boundary, not a replacement.

**Verification Description**
With a generator configured, generation runs through the interface.
The core references no concrete generator type.
Adding a target language is a new generator implementing the contract — generation, discovery, and comment identification — with no change to the core.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-008 — Language-neutral extensibility](SYS-008-language-neutral-extensibility.md)

**Related**

- [ARCH-006 — Comment detection is a generator capability](ARCH-006-pluggable-comment-finders.md) — comment identification is one operation of this contract, beside generation and discovery.

## Changes

- **2026-06-29** — Added comment identification to the generator contract: a generator classifies its language's source into code and comment regions, so the spec-id-in-comment check reads comments through the generator's own lexer (ARCH-006) instead of a separate core-owned one.
Discovery and comment identification are the same per-language lexical knowledge, so they belong to one interface.
