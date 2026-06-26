**Title**
The system enforces traceability coverage by default, computed by policy and admitting gaps only through committed waivers

**Lens**: SYS

**Status**: active

**Description**
The system shall define and enforce **traceability coverage** over the specs the `spec` command produces: only eligible relations count (`realizes`, `verifies`; not `concerns`), an uncovered spec fails by default, and an uncovered spec is admitted only through a committed waiver carrying a reason.

**Rationale**
Coverage is only an asset if it means "implemented and tested", cannot be gamed by a mere mention, and is not silently skipped.
Inverting the burden — covered unless waived — over a universe of specs that code can anchor, each at the altitude that suits it (ADR-0006), keeps the waiver list a genuine, reviewed inventory of gaps rather than mechanical noise (ADR-0005 D4, D5).

**Verification Description**
A spec covered only by `concerns` is reported uncovered; an uncovered, unwaived spec is a failure; a waiver requires a committed reason.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
- [STK-002 — A trustworthy, exportable trace record](STK-002-audit-evidence.md)

## Changes

- **2026-06-22** — Removed transitive coverage from the policy.
The coverage universe is now the directly-anchorable lenses only; `STK` and `SYS` are documentation, not coverage targets, so a roll-up through the specs that realize a spec is no longer part of the system's definition of coverage (ADR-0005, narrowed the same day).
- **2026-06-23** — Dropped "directly-anchorable specs": `STK` and `SYS` are anchored in code at file/module altitude (ADR-0006) and covered like any other spec, so the universe is every spec the `spec` command produces. The no-transitive-coverage decision from the previous entry is unchanged.
- **2026-06-23** — Narrowed what a waiver may accept: a gap is admitted only as a missing *test* — a waiver waives the `verify` requirement, matched by id or pattern, and a spec missing its realizing code is never waivable (STR-019; SW-030, CON-021).
The "committed waiver carrying a reason" is unchanged; this bounds what that reason can excuse.
- **2026-06-26** — The coverage universe is now the **generated traceables** (CON-020): a spec's `**Status**` filters generation, so only `active` and `deprecated` specs are in the universe and a `planned` spec is simply not generated.
This replaced the `coverage.scope` config (dropped) — scoping to active specs is structural, not a gate option. The default-covered-unless-waived policy is unchanged.
