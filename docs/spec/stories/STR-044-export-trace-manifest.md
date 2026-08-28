**Title**
clew exports its trace state into a cross-tool interchange manifest

**Status**: planned

**Business Value**
clew's trace state — which specs exist, what code realizes and verifies them, what is covered and what is still only planned — lives only in clew's own outputs, which only a clew-shaped reader consumes.
SpecAssay's Loupe viewer renders a portable trace matrix — the trace-manifest format — that any spec tool can emit, so heterogeneous projects show up in one cross-tool dashboard.
The format names clew explicitly as an emitter, yet clew emits nothing in it, so a clew project stays invisible to Loupe and the wider SpecAssay ecosystem.
Emitting the manifest earns a clew project a place in that view: cross-tool visibility, a planning read of its backlog, and portable audit evidence — by reusing Loupe rather than clew building a dashboard of its own.

**Problem / Context**
clew already publishes stable schemas for its own results — coverage.json and the locations record (SYS-013) — but those are clew's shapes, read without translation only by a clew-aware consumer.
Loupe expects the opposite: a foreign, tool-neutral trace manifest that carries, per row, the spec's statement, its parent edges, and a portable status across an intent-to-criterion tier model.
clew holds all of that, but in pieces: the generated traceables (the universe), the code anchors, the reconciled coverage, and the spec files themselves.
Two things are missing.
The spec scan reads each spec body but keeps only its **Status** (SW-031), so the **Description** (the row's statement) and the **Realizes** links (the row's parents) are never extracted.
And there is no seam or command to assemble that data and write it in a format clew does not own.

**Solution Approach**
Add an opt-in emitter seam and a `clew export` command that builds one tool-neutral trace model from clew's data and hands it to each configured emitter, with a single built-in emitter for the trace-manifest format.
The seam mirrors the generator interface (ARCH-003) at lower weight: an emitter is a pure map from the model to file bytes, resolved by name from a registry, activated by an `emitters` array in the configuration — so a second format later is one more registry entry, not a new command.
Extend the spec scan to surface each spec's statement and relations, the two fields the manifest needs that clew does not yet read.
Emit the manifest as the standard's requirement-to-criterion tree: each spec becomes a requirement row carrying its `realizes` anchors, and each of its acceptance criteria a criterion row carrying the `verifies` anchors that target it — and where a spec declares no criteria, construct one implicit criterion from the spec's own verification, mirroring clew's N=1 identity, so the export needs no separate mode and no wait for the criteria tier to be built.
The manifest's rows are a deliberate superset of the coverage universe: they include planned specs, mapped to a backlog status, because a planning dashboard's first number is what is coming — while coverage.json and the coverage universe (CON-020) are read, never redefined.
Keep the emitter pure by injecting the generation timestamp, so a fixed input yields byte-identical output.

**Acceptance Criteria**
- `clew export` runs each emitter listed in the configuration's `emitters` section and writes its output atomically to the resolved path; an absent or empty section writes nothing and is not an error.
- A configured emitter that is not registered fails fast with a stable error code that names it — the same shape as an unregistered generator.
- The built-in trace-manifest emitter writes a manifest whose rows cover every active, deprecated, and planned spec; a planned spec maps to `backlog`, an active covered spec to `proven`, a realized-only spec to `tracked-debt` when a waiver accepts it else `GAP`, and a spec with neither anchor to `GAP`.
- Each spec emits a `requirement` row — id, type (its lens), tier (its lens's declared tier), statement (its Description), parents (its Realizes edges), native and mapped status, origin (the ledger sequence from its id), and its `realizes` anchors as `implementations` — and one `criterion` row per acceptance criterion, carrying the criterion's assertion, its parent (the spec), and the `verifies` anchors targeting it as `proofs`.
- A spec that declares no criteria emits a single implicit criterion constructed from its `Verification Description`, carrying the spec's own `verifies` anchors, so every spec yields at least one criterion; a corpus with no declared criteria still emits a complete requirement-to-criterion tree.
- coverage.json and the coverage universe are unchanged: the export reads them and never alters what coverage counts (CON-020).
- The spec scan surfaces each spec's statement and relations, retrievable independently of the export.
- For a fixed corpus and an injected timestamp the emitted manifest is byte-stable.
- Tests cover: an empty emitters config, an unregistered emitter, a planned spec emitted as backlog, the covered / realized-with-waiver / none status mappings, statement-and-parents extraction from a spec body, a spec with no declared criteria emitting a requirement plus one implicit criterion (the spec's verifies anchors as that criterion's proofs), a spec with declared criteria emitting one criterion row each, and a golden manifest for a small corpus.

**Out of scope**
- Changing coverage semantics or the coverage universe — the export is a superset for visibility, not a redefinition of what coverage counts (CON-020, CON-021).
- Anchor enrichment beyond file and line — a symbol, end line, content hash, excerpt, or proof name is absent from the scan today and optional in the manifest; capturing it is a later story.
- Declaring a tier on each lens — the capability this export reads to fill `tier` — is its own precursor story; only consuming it belongs here.
- The optional manifest fields with no clean clew source — a coverage roll-up (the viewer recomputes it from `parents`), carrying-task links, and attestation.
- A second concrete emitter — the seam admits many formats; only the trace manifest ships here.
- Reading a manifest back, or rendering it — clew emits; the viewer is the external tool's job.

## Relations

**Realizes** (new specs)

- [SYS-016](../specs/SYS-016-cross-tool-trace-export.md)
- [ARCH-009](../specs/ARCH-009-pluggable-export-emitters.md)
- [SW-052](../specs/SW-052-export-command.md)
- [SW-053](../specs/SW-053-trace-manifest-emitter.md)
- [SW-054](../specs/SW-054-scan-statement-and-relations.md)
- [CON-042](../specs/CON-042-export-superset-of-coverage-universe.md)

**Related**

- The outward counterpart of [SYS-013](../specs/SYS-013-shared-schemas.md): SYS-013 publishes clew's own result schemas; this emits into SpecAssay's trace-manifest, a format clew does not own.
- Preserves [CON-020](../specs/CON-020-coverage-universe.md): the export is a superset of the coverage universe, not a redefinition of it.
- The emitter seam mirrors the generator interface [ARCH-003](../specs/ARCH-003-generator-interface.md).
- Reads the coverage result of [SW-028](../specs/SW-028-emit-coverage-result.md) and the anchors of [SW-022](../specs/SW-022-scan-code-into-anchor-locations.md).
- Depends on [STR-045](STR-045-lenses-declare-a-tier.md): the lens tier it declares is what fills each requirement row's `tier`.
- Mirrors clew's acceptance-criteria model on the export side, but does not depend on it: the implicit N=1 criterion stands in until that tier is authored.
