**Title**
Make project configuration first-class and adopt the lens model

**Business Value**
The tool already reads a few settings from `.ariadnerc.json`, but the configuration has no spec — its location, shape, and defaults live only in the code, and the options are scattered across CON-003, CON-005, and ARCH-001.
Two concrete gaps make this urgent: `init` hard-codes the directory it scans (`docs/spec`), and the set of valid id prefixes is frozen in the schema and a regex rather than declared by the project.
Specifying the configuration — id generation, the project's lenses, and where each artifact lives — gives every option one documented, version-controlled home, and is the foundation a setup skill and a draft skill build on (ADR-0003).
It completes ADR-0003 in one coherent move: the configured lenses become the only source of valid prefixes, the schemas drop their frozen enums, and the corpus's `Type` field becomes `Lens` — so config, schema, and specs agree instead of the corpus contradicting the new model.

**Problem / Context**
`config.ts` reads `idGeneration` (and an `idToken.pattern`) from `.ariadnerc.json` with defaults, but no spec or entity describes the file, so the contract is implicit.
`init` (STR-008) hard-codes `docs/spec` as its scan root — the under-specified point flagged in that story.
Prefix validity is enforced by `idToken.pattern` (CON-005), a regular expression disconnected from the project's actual spec kinds.
ADR-0003 decides that the project's lenses are the single source of truth for valid prefixes, and that the configuration is where they and the project layout live.

**Solution Approach**
Introduce the configuration as a domain entity (ENT-002, Configuration) and a software spec (SW-009) that defines how it is read: a single `.ariadnerc.json` at the project root, every value defaulting when absent, sections independent.
The configuration carries three sections: `idGeneration` (mode, padding — existing), `lenses` (the derived-spec kinds, each `{ id, description }`, with a default set), and `layout` (where each kind of artifact lives, including the story and entity prefixes).
Make the configured prefixes — the lens ids plus the story and entity prefixes — the single source of truth for id validity: `mint` accepts a prefix only if it is configured, retiring `idToken.pattern`'s prefix role.
Have `init` scan the `layout` artifact directories instead of the hard-coded constant, and count only ids whose prefix is configured (so non-lens files such as `docs/adr/ADR-0002-*.md` are excluded — the STR-008 false-positive).
Defaults are the opinionated template (ADR-0001 D8), so a project with no `.ariadnerc.json` behaves exactly as today.
Complete the rename ADR-0003 calls for in the same change: `Type` becomes `Lens` in every derived spec, and `derived-spec.schema.json` and `story.schema.json` drop their frozen prefix and target enums to validate against the configured lenses — leaving no second source of truth and no half-migrated corpus.

**Affected specs and artifacts**
- `ENT-002` (Configuration entity — `idGeneration` + `lenses` + `layout`; in `domain-model.md`).
- `SW-009` (the tool reads project configuration from `.ariadnerc.json`).
- CON-005 (id matches configured pattern): rewrite — a minted id's prefix must be a configured prefix (a `lenses[].id`, or `layout.stories.prefix` / `layout.entities.prefix`); the pattern is no longer the prefix authority. Retitle.
- SW-006 (derive high-water marks): `init` scans the configured `layout` directories and counts only configured prefixes, rather than a hard-coded `docs/spec`.
- CON-003 (padding configured): clarify the id form is `<prefix>-<number padded to idGeneration.padding>`; unchanged in intent.
- ARCH-001, CON-003, CON-005: re-point their `Concerns` to the Configuration entity.
- Field rename — every derived spec (ARCH-001..002, CON-001..009, NF-001..002, SW-001..009): `**Type**:` → `**Lens**:`.
- `docs/spec/schemas/derived-spec.schema.json`: rename the `Type` field to `Lens`; replace the static `id.components.prefix` and `Lens` enums with validation against the configured lens set.
- `docs/spec/schemas/story.schema.json`: the `Realizes.targets` enum validates against the configured lens set rather than a frozen list.
- Terminology — "type"/"prefix" → "lens": SW-002 (`<PREFIX>`), SW-005 (`<TYPE>-TMP-<opaque>` → `<LENS>-TMP-<opaque>`), CON-008 ("a type may not use it" → "a lens may not use it"), SW-001 (per-prefix wording), `domain-model.md` (ENT-001 `Prefix` → "a configured lens id").
- Code: `config.ts` (read `lenses` + `layout`, resolution with defaults, retire `readIdTokenPattern`), `mint.ts` (validate the prefix against the configured prefixes), `init.ts` (scan `layout` dirs, filter by configured prefixes).

**Acceptance Criteria**
- Configuration is read from a single `.ariadnerc.json` at the project root, with per-value defaults and independent sections; with no file, every value resolves to its default.
- The Configuration entity lists `idGeneration`, `lenses`, and `layout` as attributes, each with a documented default.
- `mint` accepts a prefix only if it is configured (a lens id, or the story/entity prefix), and rejects others with an explicit error and a non-zero exit, minting nothing.
- `init` scans the directories given by `layout`; with the defaults, behaviour is unchanged, and a non-lens file such as `ADR-0002-*.md` affects no mark.
- With `layout` pointing elsewhere, `init` discovers ids there.
- `idToken.pattern` no longer governs prefix validity.
- Every derived spec uses the `Lens` field; no spec retains `Type`.
- The schemas validate a spec's `Lens` and a story's `Realizes` targets against the configured lens set, not a frozen enum; adding a lens needs no schema change.
- Vitest covers: resolution falling back to defaults when the file, section, or attribute is absent; mint accepting a configured prefix and rejecting an unconfigured one; init scanning a configured layout directory and ignoring unconfigured prefixes.

**Open decisions** (resolve during refinement)
- Whether the `mint` CLI argument is renamed `<type>` → `<lens>` (a surface change to SW-008) or kept for muscle memory.
- Whether the schemas fully drop the enum and validate against config at runtime, or keep a generated/derived enum for offline validation.

**Out of scope**
- The per-lens derivation guidance and the paired `ariadne-setup` / `ariadne-draft` skills (skill concern, ADR-0003).
- Code-side lenses (SVC/UTL) and the opaque id format.
- A user-facing configuration reference document (a peer of `docs/errors.md`).

## Relations

**Realizes**

- [SW-009 — The tool reads project configuration from `.ariadnerc.json`](../derived-specs/SW-009-read-configuration.md)
- [CON-005 — A minted id's prefix must match the configured id token pattern](../derived-specs/CON-005-id-matches-configured-pattern.md) (rewritten: a minted id's prefix must be a configured prefix)
