**Title**
The export's rows are a superset of the coverage universe and never redefine it

**Lens**: CON

**Status**: planned

**Description**
The trace-manifest export emits one row per active, deprecated, **and** planned spec — a deliberate superset of the coverage universe, which is exactly the generated traceables of active and deprecated specs (CON-020).
Planned specs appear as `backlog` rows.
The export reads the coverage result; it does not change the coverage universe, coverage.json, or what coverage counts.

**Rationale**
Coverage answers "what active decisions are proven now," so it excludes planned specs by design (CON-020).
The export answers a different question — the whole trace picture, including what is coming — and a planning view's first figure is the backlog, so the export must include planned specs.
Holding these two row policies apart, in separate artifacts, keeps each honest: the export gains backlog visibility without the coverage universe drifting to match it.

**Verification Description**
A corpus with planned specs yields a manifest whose rows include those planned specs as `backlog`, while coverage.json over the same corpus still excludes them; running the export leaves coverage.json and the coverage universe unchanged.

## Relations

**Realizes**

- [SYS-016](SYS-016-cross-tool-trace-export.md)

**Related**

- Holds the line drawn by [CON-020](CON-020-coverage-universe.md): the export is a superset, not a redefinition.
- Realized in the row selection of [SW-053](SW-053-trace-manifest-emitter.md).
