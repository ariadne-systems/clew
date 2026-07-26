**Title**
The coverage universe is exactly the generated traceables (the enum members)

**Lens**: CON

**Status**: active

**Description**
Coverage is computed against exactly the **generated traceables** — the enum members the `spec` command emits (SW-014), read back through the generator (ARCH-004), not the spec files.
Generation emits a traceable only for an `active` or `deprecated` spec, so a `planned` spec has no traceable and is not in the universe.

**Rationale**
Coverage and generation must stay in lockstep: you anchor against the generated traceables, so coverage must be measured against exactly those.
Reading the universe back from the generated enums — not from a fresh scan of the spec files — means a spec enters coverage by being generated, with no second, divergent notion of "which specs count," and means a spec's status is resolved once, at generation.
Keeping coverage lens-agnostic leaves any "what counts as a spec" policy where it already lives — in what the spec command generates — rather than duplicating it as a filter here.

**Verification Description**
Every generated traceable is classified, and nothing else is.
Marking a spec `active`, so generation emits its traceable, adds it to the universe; a `planned` spec, with no traceable, never appears; a `deprecated` traceable is listed but not counted (SW-026).
The classification is unaffected by how the traceables' lenses are configured.

## Relations

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)

## Changes

- **2026-06-26** — The universe shifted from "the traceables the spec scan produces" to the **generated traceables** (the enum members), read back through the generator (ARCH-004) rather than from a re-scan of the spec files.
A spec's `**Status**` now filters generation — only `active` and `deprecated` specs become traceables — so the universe is the generated set, and status is resolved once at generation rather than re-read per coverage run (which would not scale to an ALM-sourced status).
