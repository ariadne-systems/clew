**Title**
Group the scanned specs into the configured spec sets

**Lens**: SW

**Status**: active

**Description**
Grouping assigns each scanned spec to a spec set by matching its filename against the configured set patterns.
The configured `specSets` is an ordered list of `{ name, pattern }`, where `pattern` is a regular expression over the spec's filename; an `ignore` list of patterns excludes matching specs from every set.
With no `specSets` configured, the default is one set per lens.
The resulting groups are what the generators emit as separate symbol sets.

**Rationale**
Grouping is a language-neutral, configuration-driven concern, so it belongs in the core, ahead of any generator.
Matching on the filename mirrors the dedicated-query-per-set approach proven in the issue-tracker connector, without parsing spec bodies.
The filename is matched rather than the bare id because the id exposes only the lens prefix, while the filename carries the descriptive slug a project would group on — enough for the common cases while keeping the configuration simple.

**Verification Description**
Given configured patterns, each spec is assigned to the set whose pattern matches its filename.
A spec matching an `ignore` pattern is excluded from every set.
With no `specSets` configured, the specs group one set per lens.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)

## Changes

- **2026-06-26** — Renamed "scanned traceables" to "scanned specs" throughout: a *traceable* is the generated enum member (CON-020), so the scan model that grouping operates on is the scanned spec.
Grouping is unchanged; this only aligns the vocabulary.
