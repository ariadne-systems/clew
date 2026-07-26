**Title**
The coverage report states the planned count distinctly from covered

**Lens**: CON

**Description**
The coverage report states the count of **planned** specs — those outside the coverage universe (CON-020) — distinctly from the covered count.
Promoting planned specs leaves the covered count unchanged, because planned specs are outside the universe; without the planned count beside it, a clean headline reads as complete when an increment is fully specified but not yet built.
The covered count and the universe are unchanged; the report only adds the planned count it currently omits.

**Rationale**
Coverage is the signal a reader trusts for "is this done"; a headline that counts only the universe reads `20/20` while a just-promoted increment sits planned and unbuilt, and is easily read as done.
Stating the planned count beside covered turns a green summary that hides unbuilt work into one that names it.

**Verification Description**
Given planned specs outside the universe, the coverage report states their count distinctly from the covered count; with none planned, that count is zero.
The covered count itself is unchanged.

## Relations

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)

**Related**

- Refines the report of [SW-028](SW-028-emit-coverage-result.md), surfaced by the command [SW-029](SW-029-coverage-command.md).
- Rests on [CON-020](CON-020-coverage-universe.md): planned specs are the universe's complement, which is what this surfaces.
- The report-honesty sibling of [CON-038](CON-038-coverage-report-names-waiver-absorption.md).
