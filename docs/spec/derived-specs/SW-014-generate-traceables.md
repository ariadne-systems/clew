**Title**
Generate traceables and anchoring utilities through the configured generators

**Lens**: SW

**Status**: active

**Description**
A project configures a list of generators, each declaring its target-language `type` and its own output directory (ENT-002).
For each configured generator, core hands it the scanned specs (SW-013) whose status is `active` or `deprecated` — a `planned` spec is filtered out and gets no traceable (CON-020); the generator emits, in its target language, the **traceables** — verifiable symbols organized into one symbol set per spec set (a configured grouping, by lens by default), not a single flat list — and the **anchoring utility** that lets code mark a type, a value, or a test against an id, constrained to those symbols so a reference to a missing id fails to build.
A `deprecated` spec's traceable is still emitted, marked deprecated in the target language (SW-018), so its existing anchors keep building rather than breaking the moment a spec is retired.
Core writes each generator's files into that generator's own output directory, so different targets land in different, language-idiomatic locations; a generator's directory defaults to one the generator itself declares when the configuration does not override it.
Core delegates through the generator interface only (ARCH-003); it performs no language-specific emission and references no concrete generator.

**Rationale**
This is the step that turns ids into compile-checkable symbols: the traceables make existence checkable, and the anchoring utility is how code points at a spec.
Keeping the emission behind the interface lets each language do it its own way — a union and helpers in one target, an enum and annotations in another — without the core knowing.

**Verification Description**
Given a set of scanned specs and a fake generator, the command passes only the `active` and `deprecated` specs to the generator and its emit is invoked with them; a `planned` spec yields no traceable, and a `deprecated` spec's traceable is marked deprecated.
The core references no concrete generator and contains no language-specific emission.
A generator added to the configuration is invoked without any change to the core.
Two configured generators write into their two configured output directories.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)

## Changes

- **2026-06-26** — Generation now filters by a spec's status (SW-031): only `active` and `deprecated` specs become traceables; a `planned` spec is not generated (CON-020), so it cannot be anchored and is not in the coverage universe.
A `deprecated` spec's traceable is emitted but marked deprecated (SW-018) rather than dropped — dropping it would break every anchor's build the instant a spec is retired, which is wrong.
