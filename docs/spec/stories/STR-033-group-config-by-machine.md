**Title**
Group the configuration by the machine it configures — `generation` and `scan` sections in `.clewrc.json`

**Business Value**
`.clewrc.json` is the first file a project meets, and four of its keys do not say what they act on.
`ignore` — ignore what? `exclude` / `unexclude` — exclude from what?
At the root they read as near-synonyms with arbitrarily different syntax — a regular expression over a filename versus a glob over a path — when they in fact serve two different machines over two different corpora.
Grouping each under the machine it configures makes the file explain itself at the point of reading, and gives the next filter key an obvious home instead of another context-free root-level noun.

**Problem / Context**
clew reads two corpora: the **spec corpus**, which `clew spec` turns into traceables, and the **code**, which the scan behind `clew coverage` reads for anchors.
`specSets` and `ignore` shape the first; `exclude` and `unexclude` shape the second.
Nothing at the root of the configuration carries that distinction, so a reader cannot tell which key acts on which corpus, why two filtering mechanisms exist at all, or what each one costs: a filtered spec generates no traceable, so no code can anchor it; filtered code produces no anchors, so the specs it implements read as uncovered.
The keys arrived one story at a time — `specSets` / `ignore` with STR-012, `exclude` / `unexclude` with STR-017 — each defensible alone; the flat root is what accumulated.

**Solution Approach**
Nest the four keys under the machine they configure, and leave everything else alone:

- `generation: { sets, ignore }` — what becomes a traceable;
- `scan: { exclude, unexclude }` — which paths the code scan reads.

`generation` and `scan` name the **machine**, not the artifact — that is what carries the context the bare keys never had, and it matches the commands a reader already knows (`clew spec`, `clew scan` / `clew coverage`).
The remaining root sections stay as they are: `idGeneration`, `lenses`, `layout`, `generators`, `schemas`, `waivers`, `agent` each already say what they are.

This is a **breaking** change to `.clewrc.json`, taken deliberately and taken now, while clew is the only reader and nothing is published.

It also requires retiring one claim: ADR-0005 D6 names `exclude` / `unexclude` as *the shared* keys — the seam at which other tools interoperate over the same repository without a translation layer.
That cross-tool intent is retired (considered separately if it returns), so D6's published-contract claim narrows to the **outputs** (`locations.json`, `coverage.json`), which is where STK-002's export-and-audit value actually rests.
The configuration stays documented; it stops being a contract shared with other tools.

**Affected specs and artifacts** (planned; ids bound on promotion)

- **ADR-0005 D6** — amended: the configuration is clew's own; the published contract narrows to the outputs. The outputs' contract is unchanged.
- **SYS-013** — revised: the shared-schema claim covers the locations record and the coverage result; the configuration is documented but is not a cross-tool contract.
- **ENT-002 (Configuration)** — the attribute table gains `generation` and `scan` and loses the four root keys.
- **SW-015** — `specSets` → `generation.sets`, `ignore` → `generation.ignore`.
- **SW-025**, **CON-016**, **SW-022** — `exclude` / `unexclude` → `scan.exclude` / `scan.unexclude`, wherever they name the configuration.
- **CON-013**, **CON-017**, **CON-018**, **SW-024** — left unchanged: they name the *pattern*, not its place in the configuration. The precedence rule and the glob semantics hold whatever the key is called.
- Code: `config.ts` (four reader lookups), the config fixtures in `config.test.ts` / `spec.test.ts` / `check.test.ts`, and clew's own `.clewrc.json`.

**Acceptance Criteria**
- The configuration is read from `generation.sets`, `generation.ignore`, `scan.exclude`, and `scan.unexclude`; the four former root keys are no longer read at all.
- A configuration omitting `generation` or `scan` behaves exactly as one omitting the four keys does today: one spec set per lens, nothing ignored, no configured exclusions.
- The behaviour each key governs is unchanged: spec-set partitioning (CON-013), exclusion precedence (CON-017), and root-relative glob semantics (CON-018) all hold as specified.
- The reader functions keep their signatures, so no caller changes — only the lookup path moves.
- `clew config` and the resolved configuration are unchanged in shape.
- clew's own `.clewrc.json` is migrated to the nested form.
- Vitest covers each nested section, the absence of each, and that a key left at the old root position is simply not read.
- `clew check` passes and `clew coverage` is unchanged.

**Decisions**
- The group names are **`generation`** and **`scan`**: they name the machine, not the artifact, and match the commands. Rejected: `spec`, which collides with `schemas.spec` and with `layout.specs.dir`.
- The break is taken **without** a compatibility read of the old keys and without a deprecation window: clew is the only reader and nothing is published, so a migration path would cost more than it buys.
- Only the four context-free keys move. `schemas`, `waivers`, `generators`, and `layout` already name what they are, and moving them would be churn.
- The cross-tool configuration contract (ADR-0005 D6) is **retired**, not merely bypassed — leaving the claim standing while breaking its shape would be the silent violation the charter forbids.

**Out of scope**
- The published output shapes (`locations.json`, `coverage.json`) and their contract — unchanged; only the configuration is regrouped.
- Cross-tool interoperation over the configuration — retired here; if it returns it is its own decision.
- A published JSON Schema definition for `.clewrc.json` — the durable form ADR-0005 D6 notes; not built by this story.
- Any change to what the four keys *do*; this story moves where they are read from, nothing else.

## Relations

**Related (existing corpus)**

- Amends [ADR-0005 D6](../../adr/ADR-0005-anchor-scanning-and-coverage.md) — the configuration leaves the shared, published contract; the outputs stay in it.
- Revises [SYS-013 — The system publishes stable, machine-readable schemas for its configuration and results](../specs/SYS-013-shared-schemas.md) — the claim narrows to the locations record and the coverage result.
- Revises [ENT-002 — Configuration](../specs/ENT-002-configuration.md) — the attribute table gains `generation` and `scan`.
- Revises [SW-015 — Group the scanned specs into the configured spec sets](../specs/SW-015-group-traceables.md) — the keys move under `generation`.
- Revises [SW-025 — Read the scan's `exclude` and `unexclude` patterns from configuration](../specs/SW-025-read-exclusion-patterns.md), [CON-016 — The scan excludes dependency and build directories by default](../specs/CON-016-scan-builtin-exclusions.md), and [SW-022 — Scan the code into the set of anchor locations](../specs/SW-022-scan-code-into-anchor-locations.md) — the keys move under `scan`.
- Leaves [CON-013 — Each scanned spec belongs to exactly one spec set](../specs/CON-013-spec-set-partition.md), [CON-017 — Scan exclusion precedence](../specs/CON-017-exclusion-precedence.md), [CON-018 — Exclusion patterns are repository-root-relative globs](../specs/CON-018-root-relative-globs.md), and [SW-024 — A path matching the configured patterns is excluded](../specs/SW-024-exclude-matching-paths.md) untouched — each names the *pattern*, not its configured location.
- Builds on [STR-012 — spec sets](STR-012-spec-sets.md) and [STR-017 — scan exclusion config](STR-017-scan-exclusion-config.md), whose keys this story regroups. Both stories stand as the record of what was decided then and are not rewritten.

## Changes

- **2026-07-17** — Narrowed the affected-specs list from eight specs to four.
Applying it showed that CON-013, CON-017, CON-018, and SW-024 name the *pattern* (`a user exclude is absolute`), not its place in the configuration, so the key move does not touch them; only the specs that state where the value is read from needed revising.
The story's decision is unchanged — this records that its blast radius was measured smaller than drafted.
- **2026-07-17** — Recorded two consequences found while applying the story.
SW-025's rationale rested on the shared-configuration-contract claim that this story retires (ADR-0005 D6), so it was rebased onto what still holds.
ENT-002's description forbids changing an attribute in place; that rule is **not** relaxed — the move is taken as an explicit, one-off exception, recorded on ENT-002, valid only while nothing is released.
