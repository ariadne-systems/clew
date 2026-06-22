**Title**
Generation and discovery are dual operations of the generator contract

**Lens**: ARCH

**Description**
Generation and discovery are dual operations of one generator contract (ADR-0005 D2): the generator that emits a language's markers is the same component that finds them, because it alone owns their grammar.
The generator interface therefore gains a discover operation beside generate: given a source tree, a generator returns the anchors it finds, each a spec id, the relation (realizes / verifies / concerns), and the location — a file path and line number — it was found at.
The core depends on the generator interface, never on a concrete generator; this is the same boundary as for generation, and it must not erode (ADR-0001 D9).
The core orchestrates discovery — it selects and drives the configured generators and aggregates their results — and holds no language-specific marker knowledge.

**Rationale**
The marker grammar is the generator's knowledge: it writes the markers, so it is the only component that reliably reads them back.
Placing discovery anywhere else duplicates that knowledge and leaks a language assumption into the core, the boundary ADR-0001 D9 forbids.
A generator that both emits and discovers its own markers keeps the cost of a new language down to one implementation, exactly as the generation seam does (ARCH-003), of which this is the dual.

**Verification Description**
With a generator configured, discovery runs through the interface, and the core references no concrete generator type.
Adding a target language is a new generator implementing the discover operation, with no change to the core.
Discovery is lossless with respect to generation: a generator's emitted markers round-trip through its own discover, recovering exactly the ids that were emitted (a contract invariant; ADR-0005 D2).

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)
- [SYS-008 — Language-neutral extensibility](SYS-008-language-neutral-extensibility.md)
