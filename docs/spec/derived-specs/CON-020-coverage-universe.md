**Title**
The coverage universe is exactly the traceables the spec scan produces

**Lens**: CON

**Description**
Coverage is computed against exactly the set of traceables the `spec` command produces (SW-013).

**Rationale**
Coverage and generation must stay in lockstep: the specs you anchor against are exactly the specs the tool generates markers for.
Tying the universe to the spec scan's output guarantees that — a spec enters coverage by being generated, with no second, divergent notion of "which specs count" to drift from it.
Keeping coverage lens-agnostic leaves any "what counts as a spec" policy where it already lives — in what the spec command generates — rather than duplicating it as a filter here.

**Verification Description**
Every traceable the spec scan produces is classified, and nothing else is.
Adding a spec, so the scan yields its traceable, adds it to the universe; a non-traceable — an entity, or a story — never appears.
The classification is unaffected by how the traceables' lenses are configured.

## Relations

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
