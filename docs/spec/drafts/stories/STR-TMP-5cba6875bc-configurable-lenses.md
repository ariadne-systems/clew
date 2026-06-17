**Title**
Adopt configurable lenses in place of the static spec-type taxonomy

**Business Value**
The spec-type vocabulary (SW, CON, ARCH, NF, …) is hard-coded in three disconnected places and is neither project-configurable nor self-describing.
Making the set of lenses a single configured list — each with a human-readable definition — gives a project one place to declare and explain its spec kinds, lets the tool validate prefixes and scope discovery against that one list, and lets a paired authoring skill check that it knows how to derive every declared lens.
This is the foundation that turns the type label into a governed, extensible part of the model (ADR-0003).

**Problem / Context**
A derived spec's kind lives in three places that can drift: the `id.components.prefix` enum and the `Type` field enum in `derived-spec.schema.json`, and — separately, at mint time — the `idToken.pattern` regular expression that `mint` actually enforces (CON-005).
None of them is project-configurable, and none carries a definition of what a type means, so what an agent should put in an SW versus a CON is implicit.
`init` compounds this: with no notion of which prefixes are real, it miscounts non-lens files such as `docs/adr/ADR-0002-*.md` as ids (the under-specified point flagged in STR-008).
ADR-0003 decides the direction: rename `Type` to `Lens`, move the lens set into configuration as the single source of truth, keep derivation guidance in a paired skill.

**Solution Approach**
Add a `lenses` section to the configuration (an attribute of the Configuration entity, ENT-002): a list of `{ id, description }`, where `id` is the former type/prefix and `description` is a one-line human definition.
Make the configured lens set the single source of truth for valid id prefixes: `mint` accepts a prefix iff it is a declared lens, and `init` only counts ids whose prefix is a declared lens.
Subsume `idToken.pattern`'s prefix role — a valid id is a declared lens followed by a number of the configured width (CON-003) — and rename the `Type` field to `Lens` everywhere.
Detailed per-lens derivation guidance is out of scope for the tool; it lives in the paired authoring skill, which checks its coverage against the configured lenses (ADR-0003).

**Affected specs and artifacts** (the changes this story must make)

*Field rename — mechanical:*
- Every derived spec (ARCH-001..002, CON-001..009, NF-001..002, SW-001..008): `**Type**:` → `**Lens**:`.
- `docs/spec/schemas/derived-spec.schema.json`: rename the `Type` field to `Lens`.

*Taxonomy relocation — the substantive change:*
- `docs/spec/schemas/derived-spec.schema.json`: the static `id.components.prefix` enum and the `Lens` field enum give way to the configured lens set (validate against config rather than a frozen list).
- `docs/spec/schemas/story.schema.json`: the `Realizes.targets` enum likewise references the lens set, not a frozen list.
- ENT-002 Configuration (parked draft): add a `lenses` attribute/section `[ { id, description } ]`; revisit the `idToken.pattern` attribute (largely subsumed — keep only what number-format still needs, if anything).

*Validation refactor:*
- CON-005 (id matches configured pattern): rewrite to "a minted id's prefix must be a declared lens" plus the configured number width; retitle accordingly. The pattern is no longer the prefix authority.
- CON-003 (padding configured): unchanged in intent; clarify the id form is `<lens>-<padded number>` (terminology only).

*Discovery scoping:*
- SW-006 (derive high-water marks): discovery recognizes only configured-lens prefixes, so non-lens files (ADRs, etc.) are excluded. This is the fix for the STR-008 false-positive.

*Terminology — "type"/"prefix" → "lens" in prose:*
- SW-002 (mint sequential): "minting a type", `<PREFIX>` → lens wording.
- SW-005 (mint temporary): `<TYPE>-TMP-<opaque>` → `<LENS>-TMP-<opaque>`.
- SW-008 (mint command surface): the `mint <type> [count]` argument — decide whether to rename the argument to `<lens>` (see Open decisions).
- CON-008 (TMP marker reserved): "a type may not use it" → "a lens may not use it".
- SW-001 (allocate sequence numbers): per-prefix → per-lens wording.
- `docs/spec/domain-model.md`: ENT-001 `Prefix` is "a configured lens id" rather than "matching the configured id pattern".

*Code (not specs, listed for completeness):*
- `config.ts` (read `lenses`; drop/repurpose `readIdTokenPattern`), `mint.ts` (`assertTypeMatchesPattern` → lens-membership check), `init.ts` (scope discovery to configured lenses), `errors.ts` (the invalid-prefix code's meaning shifts from "not under the pattern" to "not a declared lens").

**Acceptance Criteria**
- The configuration carries a `lenses` list of `{ id, description }`; with none configured, a documented default lens set applies.
- `mint` accepts a prefix iff it is a declared lens, and rejects an undeclared one with an explicit error and a non-zero exit, minting nothing.
- `init` counts only ids whose prefix is a declared lens; a non-lens file such as `ADR-0002-*.md` does not affect any mark.
- Every derived spec uses the `Lens` field; no spec retains `Type`.
- The schemas validate a spec's `Lens` and a story's `Realizes` targets against the configured lens set, not a frozen enum.
- `idToken.pattern` no longer governs prefix validity; existing projects behave the same once their prefixes are expressed as lenses.
- Vitest covers: a declared lens mints, an undeclared prefix is rejected, init ignores non-lens prefixes, and resolution falls back to the default lens set when none is configured.

**Open decisions** (resolve during refinement)
- How the static schemas reconcile with a config-driven lens set: drop the enums and validate against config, or keep a generated/derived enum.
- Whether `idToken.pattern` is removed entirely or retained solely for the number format (width/zero-padding), with the prefix governed by lenses.
- Whether the `mint` CLI argument is renamed `<type>` → `<lens>` (surface change to SW-008) or kept for muscle memory.
- The default lens set shipped when a project configures none (and whether code-side lenses such as SVC/UTL and the broader STK/SYS belong in the same list).
- Sequencing: this story depends on the Configuration entity (ENT-002) from the parked configuration story; confirm that ordering.

**Out of scope**
- The detailed per-lens derivation guidance and the paired skill that holds it (skill concern, not a tool spec — ADR-0003).
- A user-facing configuration/lenses reference document (a peer of `docs/errors.md`).
- The `artifacts.dir` option and the general config-resolution formalization — delivered by the parked configuration story, on which this one builds.

## Relations

**Realizes**

- CON-005 — (rewritten) a minted id's prefix must be a declared lens
