**Title**
clew validates each spec and story against a configurable schema

**Business Value**
A spec or story that is structurally malformed — a missing required field, a typo'd status, an id that does not fit — silently weakens the corpus, because no contract says what a document must satisfy.
Nothing catches a drafting mistake until something downstream breaks.
A configurable schema, validated when clew reads a document, makes structural correctness a *checked* contract — and because the schema is the adopter's, a project using clew enforces **its own** authoring template, not clew's.

**Problem / Context**
clew validates a few things piecemeal on scan today — the `**Status**` value (CON-022), the id prefix — but there is no general, configurable contract for a document's structure.
The fields a spec must carry (`Title`, `Description`, `Rationale`, …) are convention, enforced by review, not by the tool; STR-024 even carries an ad-hoc "a promoted spec has its required fields" check.
And the structure an adopter wants differs from this project's — baking this project's fields into clew would force every adopter onto the same template.

**Solution Approach**
- Each document type (`story`, `derived-spec`) has a **schema** — a small, clew-specific shape (not JSON Schema) authored in **YAML** and referenced per type from `.ariadnerc.json`, so it is swappable and an adopter can comment it.
- Before clew uses a schema, it **validates the schema itself** against clew's own minimum contract — a well-formed shape that does not reach into the pinned core — and refuses a schema that fails, so a malformed schema fails *at the schema*, not mid-scan.
- clew then validates each document against its schema **when it reads it** (on scan), at the same point as the existing status validation.
- The schema is split. clew **pins only the parts it mechanically reads** — the id form (a configured prefix and a number), that ids are unique, the `**Status**` grammar and value set, and that `## Relations` links resolve — because clew depends on each, and enforces them **in code**, not from the project schema. Everything else — which `**Bold label**` fields a document must carry, and their enums — is **project-defined** in the YAML, so an adopter brings its own template. clew validates `pinned-core ∪ project-schema`.
- Severity: a **pinned-core** violation always **fails** (clew cannot function otherwise). A **project-field** violation follows `onError` — `warn` (the default) reports without stopping the scan, `fail` rejects — so a project adopts field validation incrementally without ever silently ignoring a violation.

**Dependency** (justified per 004)
This adds one library — a YAML parser (`yaml`); clew parses only JSON today.
A schema is a hand-authored contract an adopter reads and maintains, and YAML's comments and low punctuation suit that far better than JSON.
`.ariadnerc.json` stays JSON (machine settings); the schemas are YAML (authored contracts).
004 gains `yaml` on implementation.

**Acceptance Criteria**
- A malformed schema, or one that tries to redefine the pinned core (the id form or the status values), is rejected before any document is validated against it.
- A document missing a project-required field, or carrying a field value outside its enum, is reported with its location.
- A document whose id, `**Status**`, uniqueness, or relation-link form violates the pinned core **fails**, whatever the project schema says.
- With no project schema configured, only the pinned core is enforced — a document carrying any fields passes as long as the core holds.
- A project-field violation follows `onError`: `warn` (the default) reports without stopping the scan, `fail` rejects.
- A different project schema (different required fields) is honoured without any change to clew.
- Tests cover: a conformant document; a missing-required-field and an out-of-enum violation; a pinned-core violation (always fails); `warn` versus `fail` for project fields; and the absent-project-schema (core-only) case.

**Out of scope**
- **Typed relations and inverse materialization** — relation tuples, `from`/`to` target-type checks, auto-writing `RealizedBy` into the target, bidirectional consistency. A separate, larger story; this validates only that a relation link *resolves*.
- **Multi-id files** (`architecture.md`, `domain-model.md`) — the file-per-id model only.
- **Auto-fixing** a violation — clew reports; fixing is the author's job.
- **Per-rule severity** and a **written validation report** — the reference implementation has both; v1 has one global `onError` for project fields (plus the always-fail core) and reports to stderr.
- clew's **output** schemas (config, locations, coverage) — SYS-013's concern, a different axis (clew's own output, not input documents).

## Relations

**Realizes**

- [SYS-TMP-SCHEMA-001 — The system validates each artifact against its declared schema when it reads it](../derived-specs/SYS-TMP-SCHEMA-001-validate-artifacts-on-load.md)

**Realizes** (new specs)

- [ARCH-TMP-SCHEMA-001 — A document schema pins only what clew reads; the rest is project-defined](../derived-specs/ARCH-TMP-SCHEMA-001-schema-core-is-what-clew-reads.md)
- [SW-TMP-SCHEMA-001 — The scan validates each document against its schema](../derived-specs/SW-TMP-SCHEMA-001-scan-validates-schema.md)
- [CON-TMP-SCHEMA-001 — A document that violates its schema is rejected, or warned per config](../derived-specs/CON-TMP-SCHEMA-001-reject-schema-violation.md)
- [CON-TMP-SCHEMA-002 — A schema is validated against clew's minimum contract before it is used](../derived-specs/CON-TMP-SCHEMA-002-validate-schema-before-use.md)

**Related**

- Supersedes the ad-hoc "a promoted spec has its required fields" check of [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](STR-024-clew-check-suite.md) — structural conformance becomes this scan-time validation; STR-024 is adjusted to defer to it.
- Generalizes [SW-031 — The spec scan reads each spec's implementation state](../derived-specs/SW-031-scan-spec-status.md) and [CON-022 — A spec's status is one of the declared values](../derived-specs/CON-022-valid-status.md) — the status read and value check are an instance of the pinned core.
- Distinct from [SYS-013 — The system publishes stable, machine-readable schemas for its configuration and results](../derived-specs/SYS-013-shared-schemas.md) — that publishes schemas for clew's own *output*; this validates *input* documents.
- Adds a schema reference per document type to ENT-002 (Configuration) — an integration edit on promotion.
