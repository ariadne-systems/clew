**Title**
Group traceables into configured spec sets

**Status**: done

**Business Value**
The `spec` command's skeleton emits one symbol set per group, but the only grouping is the default by-lens; a project cannot define its own sets.
Letting a project declare its spec sets — each by a matcher over the spec's filename — lets it shape the generated enums to how it actually thinks about its specs (a security set, a public-API set, …), the way a dedicated query per set does in an issue tracker.
Each generated set is a small, focused enum, so code anchors against the set it belongs to rather than one giant union.

**Problem / Context**
The skeleton (`STR-011`) makes generation set-aware but groups by lens only.
There is no way to define custom groupings, to exclude specs from generation, or to guarantee the sets are coherent.

**Solution Approach**
Add a `specSets` configuration section: an ordered list of `{ name, pattern }`, where `pattern` is a regular expression over the spec's filename.
Core groups each scanned traceable into the set whose pattern matches its filename; the generator then emits one symbol set per spec set (the skeleton already does this).
The sets **partition** the traceables — a traceable belongs to exactly one set (CON-013):
- a traceable matching more than one set's pattern is a configuration error (overlap);
- a traceable matching no set is a configuration error (unmatched), unless a catch-all set is configured to collect the rest;
- an optional `ignore` list of patterns excludes matching traceables from every set — they get no symbol, deliberately.
When no `specSets` are configured, the default is one set per lens.

**Affected specs and artifacts**
- New: `SW-015` — group the scanned traceables into the configured spec sets.
- New: `CON-013` — each traceable belongs to exactly one spec set, or is explicitly ignored.
- ENT-002 (Configuration): add a `specSets` section (an ordered list of `{ name, pattern }`, one optionally flagged the catch-all) and an `ignore` list of patterns.

**Acceptance Criteria**
- A project can declare `specSets` — named sets, each matched by a regex over the spec's filename — and generation emits one symbol set per declared set.
- A traceable matching more than one set is rejected with an explicit error (overlap).
- A traceable matching no set and no ignore pattern is rejected with an explicit error (unmatched), unless a catch-all set is configured, in which case it joins the catch-all.
- An `ignore` pattern excludes matching traceables from every set; no symbol is generated for them.
- With no `specSets` configured, the default is one set per lens.
- Vitest covers: grouping by configured patterns; overlap → error; unmatched → error, and unmatched → catch-all when one is configured; ignore excludes; the default by-lens grouping.

**Out of scope**
- Grouping by a spec body attribute rather than the filename — a richer matcher for later; the filename regex is the first shot.
- The generator's per-set output shape — covered by the skeleton's generation and interface specs.

## Relations

**Realizes**

- [SW-015](../specs/SW-015-group-traceables.md)
- [CON-013](../specs/CON-013-spec-set-partition.md)

This story depends on the `spec` command skeleton (`STR-011`).
