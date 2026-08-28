**Title**
The trace-manifest emitter maps the trace model to the interchange manifest

**Lens**: SW

**Status**: planned

**Description**
The built-in trace-manifest emitter serializes the trace model to the external trace-manifest JSON.
Mirroring clew's acceptance-criteria altitude split, it emits two kinds of row per spec: a `requirement` row for the spec, and one `criterion` row for each acceptance criterion the spec exposes.
A spec that declares no criteria contributes a single **implicit** criterion constructed from the spec itself — its assertion is the spec's `Verification Description` — so every spec yields at least one criterion and the manifest is a uniform requirement-to-criterion tree whether or not the criteria tier has been adopted.
The rows span the coverage universe as a superset (CON-042): active, deprecated, and planned specs, with a planned spec mapped to `backlog`.

The requirement row carries the spec's `id`, `type` (its lens), `tier` (the tier its lens declares), `statement` (its Description), `parents` (the specs it Realizes), and the spec's `realizes` anchors as `implementations`.
A criterion row carries its own `id` — the spec id plus the criterion's local id, or a reserved suffix for the implicit one — a `tier` of `criterion`, the criterion's assertion as `statement`, its `parent` (the spec), and the `verifies` anchors that target it as `proofs`; the implicit criterion's proofs are the spec's own `verifies` anchors.
`realizes` therefore lands on the requirement and `verifies` on the criterion — clew's altitude split and the manifest's structure at once.

Each row's core `status` maps from clew's state: a criterion is `proven` when a `verifies` proof targets it, else `GAP`; a requirement is `proven` when realized and every criterion proven, `tracked-debt` when realized under a waiver, else `GAP`; a planned spec's rows are `backlog`; a deprecated spec's are `proven` when covered, else `GAP`.
`nativeStatus` carries clew's own coverage term alongside the reduction.
The envelope records the schema version, the emitter name and clew's version, the injected generation timestamp, the gate result (whether `clew check` passes, with its violations as the failures), and the totals and status counts computed over the rows.

**Rationale**
The manifest is a foreign contract, so the emitter's job is a faithful, total mapping from clew's state to it.
Constructing an implicit criterion when a spec declares none mirrors clew's own N=1 identity, so the export needs no separate mode and no dependency on the criteria tier being built: a corpus with no declared criteria still emits a complete requirement-to-criterion tree, and one with declared criteria emits them as the criterion rows — the same code path, the criterion merely declared or implicit.
Placing `realizes` on the requirement and `verifies` on the criterion is clew's altitude split and the manifest's structure at once, so the mapping is a rename, not a re-interpretation.
Rows are a superset of the coverage universe because the manifest feeds a planning view, where the backlog — the planned specs coverage excludes — is first-class (CON-042).

**Verification Description**
For a small corpus the emitter produces a manifest matching a golden file.
A spec with no declared criteria yields a `requirement` row carrying its realizes anchors as implementations, and one implicit `criterion` row whose statement is the spec's Verification Description and whose proofs are the spec's verifies anchors.
A spec that declares criteria yields one `criterion` row per criterion, each with its own proofs, while `realizes` stays on the requirement.
A planned spec's rows are `backlog`; the envelope's status counts equal the row tallies; the output is byte-identical for a fixed corpus and timestamp.

## Relations

**Realizes**

- [SYS-016](SYS-016-cross-tool-trace-export.md)

**Related**

- The first emitter behind [ARCH-009](ARCH-009-pluggable-export-emitters.md).
- Its row set is governed by [CON-042](CON-042-export-superset-of-coverage-universe.md).
- Reads the statement and relations of [SW-054](SW-054-scan-statement-and-relations.md), the coverage classification of [SW-026](SW-026-compute-coverage.md), and the lens tier of [SW-055](SW-055-lens-declares-tier.md).
- Its criterion rows mirror clew's acceptance-criteria altitude split; on the export side the implicit N=1 criterion stands in until the criteria tier is authored.
