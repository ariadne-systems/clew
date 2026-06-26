**Title**
The scan excludes tool-owned and non-source locations by default

**Lens**: CON

**Status**: active

**Description**
The code scan never reports anchors from tool-owned or non-source locations.
By default it skips dependency and build directories (for example `node_modules` and build output) and the generated traceables directory — the `outputDir` of each configured generator (ENT-002), which holds the markers' definitions, not their uses (CON-012).
In this story the built-in exclusions are the whole exclusion behaviour: there is no configuration to add to or override them, so they always apply.
STR-017 adds the configurable `exclude` / `unexclude` layer on top: there the built-in defaults become root-relative globs (CON-018) and the lowest precedence layer, which a user `exclude` or an `unexclude` can override (CON-017); the built-ins are the base of that precedence, not an immovable floor (ADR-0005 D6).

**Rationale**
The generated traceables directory declares the markers (`export function realizes(...)`, the enum members); scanning it as if it were user code would invent anchors that no one wrote, polluting every downstream consumer (ADR-0005 D1).
Dependency and build directories are not the project's source and would add noise and cost.
Excluding the generated directory is safe for resolution: discovery derives a reference's id from the member name, not by reading the generated definitions (SW-021), so nothing the scan needs to resolve an id lives there.
Excluding them by default makes the scan usable out of the box, before any project configuration, and keeps the located set faithful to what the project's own code anchors.

**Verification Description**
A marker placed under an excluded location (`node_modules`, the generator's `outputDir`, a build directory) produces no anchor location.
A marker in the project's own source outside those locations is reported normally.
The exclusions apply with no configuration present.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
