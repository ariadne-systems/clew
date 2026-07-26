**Title**
The tool resolves the project configuration into a single view

**Lens**: SW

**Status**: active

**Description**
The tool resolves the project's configuration into one view that callers can read without re-applying defaults or derivations themselves.
The view combines the independently-defaulted sections (SW-009) — the lenses and the layout — with the values the configuration does not state directly: the valid id prefixes, derived as the lens ids plus the story and entity prefixes (ADR-0003), and, for each configured generator, its resolved output directory — the configured `outputDir` or, when absent, that generator's own default.
Resolving a generator's default output directory uses the generator interface (ARCH-003), so the resolution names no concrete generator; the generators come from the in-core registry (ADR-0007).
The result is a complete, resolved snapshot: nothing in it requires the caller to know a default.

**Rationale**
The resolved configuration is the file plus the tool's defaults and derivations, and that resolution already exists piecemeal in the core readers and in how `spec` resolves an output directory.
Exposing it as one behaviour means the command and every authoring skill read the resolved view from a single place, instead of each re-implementing the defaults against a config shape that can change.

**Verification Description**
Given a partial configuration — sections or values omitted — the resolved view carries the defaulted lenses and layout, the derived prefixes, and each generator's output directory resolved to its configured value or its default.
A generator with no `outputDir` resolves to that generator's default directory.
The resolution names no concrete generator; supplying a fake generator resolves the view against it.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)
- [SYS-010](SYS-010-configurable-lenses.md)

## Changes

- **2026-07-08** — Revised for ADR-0007, which folds the in-tree generators into the core.
The resolution still names no concrete generator and reaches each through the interface, but the generators now come from the in-core registry rather than being injected by the caller.
