**Title**
The scan excludes a path matching the configured patterns

**Lens**: SW

**Description**
A candidate path the scan would otherwise read is excluded when the exclusion precedence resolves to excluded for it.
An excluded path is invisible to the scan: it is not read, it is never handed to a generator's discover, and it produces no anchor location.
The filter is applied **before** discovery, so excluded code never reaches a generator's marker grammar (it is dropped during the walk, not after parsing).
Exclusion is decided per path, for files and directories alike; pruning a directory is the optimization for a directory match, and the per-file decision still applies to every file the walk reaches.
The descent rule is explicit, so pruning never silently defeats `unexclude`:

- a directory a **user `exclude`** matches is pruned unconditionally — the user veto is absolute, so nothing beneath it can be re-included;
- a directory a **built-in default** would exclude is pruned only when no configured `unexclude` pattern could match a path beneath it, and is otherwise descended, with the per-file precedence deciding each file inside;
- any other directory is descended.

This keeps the common case cheap — a built-in-excluded tree like `node_modules` is pruned outright when no `unexclude` reaches into it, never walked — while still honouring an `unexclude` that does reach in.

**Rationale**
Filtering at the walk, before parsing, avoids wasting work on files that would be discarded and keeps every downstream consumer — coverage, resolution — blind to excluded data, exactly as it must be for the located set to be faithful (ADR-0005 D1).
Pruning a directory is the cheap path, but it must not drop a path `unexclude` re-includes, or the override would be silently defeated.

**Verification Description**
A file matching an exclusion produces no anchor location, while a non-excluded sibling in the same directory is scanned normally.
A file re-included by `unexclude` under a directory a built-in default would exclude is reached and scanned.
No excluded file is parsed — its content never reaches discovery.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
