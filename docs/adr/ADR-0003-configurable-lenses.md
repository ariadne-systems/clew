# ADR-0003: Configurable lenses replace the static spec-type taxonomy

- Status: Accepted.
- Date: 2026-06-17
- Deciders: project maintainer.

## Context

Every derived spec carries a `Type` (SW, CON, ARCH, NF, …).
The valid set is hard-coded twice in `derived-spec.schema.json` — once as the `id.components.prefix` enum and again as the `Type` field enum — while prefix validity at mint time is enforced separately by a configured regular expression (`idToken.pattern`, CON-005).
So the spec-type vocabulary lives in three places, and in none of them is it project-configurable or self-describing.

The tool is agent-driven: an agent derives the specs of each type.
What a software spec versus a constraint spec should contain is today implicit knowledge.
There is no project-controlled, durable definition of each type, and no way for a project to add or describe its own.

## Decision

Rename `Type` to **`Lens`**.
A lens is the viewpoint through which a category of traceable is derived — the software lens, the constraint lens, the architecture lens.
The metaphor fits an agent-derivation tool: you derive specs *through* a lens.

The set of lenses is **project configuration**.
Each lens is `{ id, description }`: `id` is the former type/prefix (SW, CON, …); `description` is a one-line, human-facing definition of what the lens means.
This becomes a `lenses` section in `.ariadnerc.json`, an attribute of the Configuration entity (ENT-002).

The configured lens set is the **single source of truth for valid id prefixes**.
It drives mint prefix validation — subsuming `idToken.pattern`'s prefix role — and scopes `init` discovery to lens prefixes, so non-lens files such as ADRs are no longer miscounted as ids.

Detailed derivation guidance stays **out of the tool**.
How an agent authors specs through a lens — the method — lives in a paired authoring skill, not in config; the tool never reads it.
The short `description` in config is a definition for humans, not a derivation prompt.
The line: a one-line *definition* in config, the *method* in the skill.

The paired skill **validates its coverage against the configured lenses**.
Before deriving through a lens, the skill confirms it holds guidance for it; on a gap it stops and asks rather than inventing.
Taxonomy (config) and method (skill) stay in sync through this check, with no coupling and no tool-side knowledge of the method.

### Rejected alternatives

Keep `Type` as a static schema enum: not project-configurable, and it already duplicates the prefix enum and drifts from the `idToken.pattern` regex.

Put derivation guidance in config: the tool would carry, version, and validate prompt text it never executes, eroding the tool/agent boundary the project deliberately maintains.

A `lens` field separate from the id prefix: two sources of truth for one vocabulary.

## Consequences

A broad but mostly mechanical rename of `Type` to `Lens` across every derived spec and the schema.

`.ariadnerc.json` gains a `lenses` section; the schema's static enums give way to config; `idToken.pattern` is largely subsumed (a valid id is a configured lens followed by a number of the configured width).

`init` gains a precise prefix allowlist, fixing the ADR-style false positive flagged in STR-008.

A paired authoring skill becomes part of the workflow, owning per-lens method and self-checking its coverage.

This is a deep refactor touching roughly twenty specs, both schemas, the domain model, and the configuration.
It is sequenced after the configuration story that introduces the Configuration entity (ENT-002), since lenses are an attribute of it.
