**Title**
Generate traceables and anchoring utilities through the configured generators

**Lens**: SW

**Description**
For each configured generator, core hands it the scanned traceables; the generator emits, in its target language, the **traceables** — verifiable symbols organized into one symbol set per spec set (a configured grouping of traceables, by lens by default), not a single flat list — and the **anchoring utility** that lets code mark a type, a value, or a test against an id, constrained to those symbols so a reference to a missing id fails to build.
Core delegates through the generator interface only (ARCH-003); it performs no language-specific emission and references no concrete generator.

**Rationale**
This is the step that turns ids into compile-checkable symbols: the traceables make existence checkable, and the anchoring utility is how code points at a spec.
Keeping the emission behind the interface lets each language do it its own way — a union and helpers in one target, an enum and annotations in another — without the core knowing.

**Verification Description**
Given a scanned traceable set and a fake generator, the command passes the set to the generator and the generator's emit is invoked with it.
The core references no concrete generator and contains no language-specific emission.
A generator added to the configuration is invoked without any change to the core.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
