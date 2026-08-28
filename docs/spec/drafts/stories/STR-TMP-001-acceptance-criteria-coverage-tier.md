**Title**
A spec carries acceptance criteria, and coverage verifies it per criterion

**Status**: planned

**Business Value**
A spec can stay a readable, coarse capability while coverage stays honest at the grain of its individual acceptance criteria.
"Verified" stops meaning "at least one test named this spec" and starts meaning "every criterion this spec promised has a falsifying test".
This is also what lets clew absorb the wider spec-driven family — Spec Kit, BDD, use-case — whose shape is a coarse requirement owning atomic acceptance criteria, rather than only the case where a spec and a single criterion coincide.

**Problem / Context**
Today a spec is its own atomic unit: it carries one implicit verification, and coverage flips it **Verified** on the first `verifies` anchor that names it (SW-026).
A spec that promises several independently testable assertions therefore reads **Covered** the moment *one* of them is tested — the others are invisible to coverage.
The reverse-scan (SW-026, CON-020) has no notion of "3 of 5 criteria verified", so the green it reports can be earned by a fraction of the promised behaviour.
It also means clew cannot represent a corpus authored the way most spec-driven methods author one — a requirement owning its acceptance criteria — because there is nowhere for those criteria to live as addressable, checkable units.

**Solution Approach**
Introduce the acceptance criterion as a first-class, addressable sub-unit of a spec, in the language-neutral core only — the generators are separate increments (STR-TMP-002/003/004).

1. **Schema** — a spec may carry an optional `## Acceptance Criteria` block, each criterion a stable local id and its assertion text.
Because clew *reads* this block (it is the coverage denominator), it is part of the pinned core clew enforces, not a project-schema field (revises ARCH-007), and the **schema checker validates it**: the block's grammar and local-id form, and that `**Verification Description**` is required *unless* a criteria block is present.
A spec with no block is one implicit criterion whose assertion **is** its `**Verification Description**` — the N=1 identity — so every existing spec is unchanged.
The tier needs no configuration: it is always available and isolated entirely by the N=1 case; there is no project toggle.

2. **Traceable model** — a generated traceable is a spec together with its criteria; `realizes` anchors the spec (coarse), `verifies` anchors a criterion (fine) (revises SW-014).
A new spec pins this altitude split — the verification grain is the criterion, the realization grain is the spec — extending the relation taxonomy (ADR-0004) rather than replacing it.
The criterion reference in a `verifies` anchor is **optional**: omitted, it targets the spec's implicit criterion, so an existing `verifies(SPEC)` anchor is unchanged and means "verifies the sole criterion"; a spec that *declares* criteria requires a named criterion (a checker rule).

3. **Coverage** — the reverse scan aggregates criterion → spec: a spec is **Covered** only when it is realized *and* every criterion is verified; in between it reports **partly verified**, naming each open criterion by its local id (revises SW-026, CON-020).
With one implicit criterion this reduces to today's rule exactly.

4. **Criterion identity** — a criterion id is assigned once and is append-only: never renumbered, never reused; a removed criterion's id is retired, not recycled (a new CON, the criterion-level analogue of CON-002).
A criterion is self-describing in the generated symbol by a **title suffix**, as a spec carries its slug — but its stable local **id**, not the title, is the authoritative key for uniqueness and for discovery, so a generic, absent, or duplicated criterion title never collides (mirroring how a spec's id, not its slug, is authoritative).

5. **Zero footprint until used** — the criterion apparatus materialises only where criteria are declared; a corpus in which no spec declares criteria produces byte-identical generated output and identical coverage to today (CON-012).
The tier costs a non-adopter nothing — in the schema, the output, and the anchors alike.

The new spec drafts this story needs — the acceptance-criteria schema block, the verifies-anchors-a-criterion model, criterion-id stability, and partial-verification reporting — are authored in the follow-up drafting pass; this story fixes the decomposition and the decisions above.

**Acceptance Criteria**
- A spec may carry a `## Acceptance Criteria` block of stably-identified criteria; the **schema checker** enforces the block's grammar and that `**Verification Description**` is required unless the block is present (ARCH-007 pinned core).
- A spec with no block is one implicit criterion whose assertion is its `**Verification Description**` (N=1 identity), leaving every existing spec unchanged; the tier requires no configuration.
- A generated traceable exposes its spec and each criterion as addressable symbols; `realizes` targets the spec, `verifies` targets a criterion — the criterion reference **optional**, defaulting to the implicit criterion, so an existing spec-only `verifies` anchor is unchanged; a spec that declares criteria requires a named criterion.
- Coverage aggregates criterion → spec: **Covered** requires realized and *every* criterion verified; a spec realized with some criteria unverified reports **partly verified** and names each open criterion.
- The classification reduces to today's Covered/Realized/Verified/None exactly when every spec has a single implicit criterion, and a corpus with no declared criteria yields byte-identical output and identical coverage to today (CON-012).
- A criterion id is append-only — never renumbered or reused; a retired criterion's id is not recycled.
- The change is language-neutral: it is verifiable against a fake generator, with no target-language emission in this increment.

**Out of scope**
- Emitting criteria as symbols in any target language, and discovering per-criterion anchors — deferred to the generator stories (STR-TMP-002 TypeScript, STR-TMP-003 Java, STR-TMP-004 Swift).
- Importing a Spec-Kit-shaped corpus into this model — a later increment; this story only makes the model able to hold it.
- Any change to how `concerns` behaves — it stays a spec-level coupling, unaffected by the criterion grain.
