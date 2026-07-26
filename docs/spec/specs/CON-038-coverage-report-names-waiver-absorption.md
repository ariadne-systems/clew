**Title**
A coverage waiver's report names the ids it absorbs

**Lens**: CON

**Description**
The coverage report names the ids each waiver currently absorbs, and flags a glob waiver that has begun matching specs newer than the waiver itself.
A waiver admits a gap by marking a spec covered; without naming what it absorbs, a stale waiver — its spec now has a test — or an over-broad glob — it silently swallows specs promoted after it was written — hides a real gap behind the covered count.
The report surfaces each waiver's current reach; it does not change waiver semantics (CON-021).

**Rationale**
A waiver is a committed exception, but a glob waiver's reach drifts as the corpus grows: it absorbs specs that did not exist when it was written, marking them covered with no test.
Naming the absorbed ids, and flagging a waiver that matches specs newer than itself, makes that drift visible instead of silent — so a waiver stays the deliberate exception it was meant to be, not a widening blind spot.

**Verification Description**
The coverage report names the ids each waiver absorbs.
Given a glob waiver and a spec newer than the waiver that it matches, the report flags it; a waiver matching only specs that predate it is not flagged.

## Relations

**Realizes**

- [SYS-012 — The system enforces traceability coverage by default, computed by policy and admitting gaps only through committed waivers](SYS-012-coverage-policy-and-waivers.md)

**Related**

- Refines the report of [SW-028 — Emit the coverage result as `coverage.json` and a human-readable report](SW-028-emit-coverage-result.md), surfaced by the command [SW-029 — The tool exposes a `coverage` command that reports coverage](SW-029-coverage-command.md).
- Sits beside [CON-021 — A waiver never hides a spec that is missing its implementation](CON-021-missing-realize-never-waivable.md): that bounds what a waiver may do, this makes what it *does* do visible.
- The report-honesty sibling of [CON-037 — The coverage report states the planned count distinctly from covered](CON-037-coverage-report-shows-planned-count.md).
