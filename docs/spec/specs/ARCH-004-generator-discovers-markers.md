**Title**
Generation and reading back are dual operations of the generator contract

**Lens**: ARCH

**Status**: active

**Description**
Generation and discovery are dual operations of one generator contract (ADR-0005 D2): the generator that emits a language's markers is the same component that finds them, because it alone owns their grammar.
The generator interface therefore gains a discover operation beside generate: given a source tree, a generator returns the anchors it finds, each a spec id, the relation (realizes / verifies / concerns), and the location — a file path and line number — it was found at.
The same contract reads a generator's **emitted traceables** back: given its generated output, a generator returns the traceable ids it declared — the coverage universe (CON-020) — because the component that wrote the enum members is the one that can read them, just as with the markers.
The core drives discovery through this interface and never reaches into a concrete generator's internals; the concrete generators live in-tree, bound at a single registry point, as for generation (ADR-0007).
The core orchestrates discovery — it selects and drives the configured generators and aggregates their results — and holds no language-specific marker knowledge.

**Rationale**
The marker grammar is the generator's knowledge: it writes the markers, so it is the only component that reliably reads them back.
Placing discovery anywhere else duplicates that knowledge and leaks a language assumption into the core's orchestration, which reaches every generator through the interface (ADR-0001 D9, as revised by ADR-0007).
A generator that both emits and discovers its own markers keeps the cost of a new language down to one implementation, exactly as the generation seam does (ARCH-003), of which this is the dual.

**Verification Description**
With a generator configured, discovery runs through the interface, and the core's orchestration reaches generators only through it.
Adding a target language is a new generator implementing the discover operation, plus its registration.
Discovery is lossless with respect to generation: a generator's emitted markers round-trip through its own discover, recovering exactly the ids that were emitted (a contract invariant; ADR-0005 D2).
A generator's emitted traceables read back through the interface recover exactly the ids it generated, forming the coverage universe without re-scanning the specs.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)
- [SYS-008 — Language-neutral extensibility](SYS-008-language-neutral-extensibility.md)

## Changes

- **2026-06-26** — Broadened the contract from generate/discover to a third read-back operation: reading a generator's **emitted traceables** back to form the coverage universe (CON-020), so coverage reads the generated enums rather than re-scanning the spec files.
It is the generator's, for the same reason discovery is — it owns the grammar of what it emitted. The title's "discovery" became "reading back" to cover both reading anchors and reading the emitted traceables.
- **2026-07-08** — Revised for ADR-0007, which folds the in-tree generators into the core.
Dropped the clause that the core never depends on a concrete generator as an unerodable package boundary; the discover and read-back contract is unchanged, and the core's orchestration still reaches every generator through the interface, but the concrete generators are now in-tree, bound at a single registry point.
