**Title**
Configuration — the tool's per-project self-description

**Lens**: ENT

**Status**: active

**Description**
Configuration is the tool's per-project self-description, read from `.clewrc.json` at the project root.
It declares how ids are formed, the lenses the project uses, and where each kind of artifact lives.
It is version-controlled and shared with the team through git, alongside the state.
Its shape grows only by adding attributes or sections; existing ones are never changed in place.
Every attribute has a documented default, so a missing file or attribute is equivalent to that default (SW-009).
The defaults are the opinionated template (ADR-0001 D8); a project overrides only what differs.

An id is `<prefix>-<number>`, where the number is zero-padded to `idGeneration.padding` and the prefix is a configured one — a `lenses[].id` for a spec, or `layout.stories.prefix`.
The set of configured prefixes is the single source of truth for id validity, so no separate id pattern is configured (ADR-0003 subsumes the former `idToken.pattern`).

An attribute that shapes a machine is grouped under it: `generation` for what becomes a traceable, `scan` for which paths the code scan reads.

| Attribute | Type | Description |
| --- | --- | --- |
| `idGeneration.mode` | `"sequential" \| "opaque"` | The id-generation scheme (ARCH-001). Defaults to `sequential`. |
| `idGeneration.padding` | `Integer` | Width to which sequential id numbers are zero-padded (CON-003). Defaults to `3`. |
| `lenses` | `List<{ id: String, description: String }>` | The spec kinds (the `Lens` field) and the valid spec prefixes (ADR-0003). Each carries a one-line human definition. Defaults to `STK, SYS, SW, ARCH, NF, CON`. |
| `layout.stories` | `{ dir: String, prefix: String }` | Where stories live and their id prefix. Defaults to `{ "docs/spec/stories", "STR" }`. |
| `layout.specs` | `{ dir: String }` | Where specs live; their prefixes are the `lenses` ids. Defaults to `docs/spec/specs`. |
| `layout.drafts` | `{ dir: String }` | Where unapproved drafts live (mirrors the spec tree). Defaults to `docs/spec/drafts`. |
| `layout.state` | `{ file: String }` | The StateStore file (CON-001). Defaults to `.clew/state.json`. |
| `generators` | `List<{ type: String, outputDir?: String }>` | The language generators to run; each declares its target-language `type` and the directory it writes into, relative to the project root (SW-014). A generator's `outputDir` defaults to that generator's idiomatic location. Optional; with none configured, nothing is generated. |
| `generation.sets` | `List<{ name: String, pattern?: String, catchAll?: Boolean }>` | Named spec sets, each matched by a regular expression over the spec's filename; one symbol set is generated per set (SW-015). Optional; with none configured, the default is one set per lens. One set may set `catchAll` to collect otherwise-unmatched specs, in which case it needs no pattern (CON-013). |
| `generation.ignore` | `List<String>` | Regular expressions over the spec's filename; a matching spec is excluded from every spec set and produces no symbol (CON-013). Optional. |
| `scan.exclude` | `List<String>` | Repository-root-relative globs (CON-018); a matching path is excluded from the code scan and produces no anchor (SW-024, SW-025). A user `scan.exclude` is absolute in the exclusion precedence (CON-017). Optional. |
| `scan.unexclude` | `List<String>` | Repository-root-relative globs (CON-018) that re-include a path a built-in default (CON-016) would exclude; never overrides a user `scan.exclude` (CON-017). Optional. |
| `waivers` | `List<{ id?: String, pattern?: String, reason: String }>` | The committed coverage waiver list: each entry targets a spec `id` or a glob `pattern` over ids (exactly one), with a reason, and waives a missing *test* — a matching spec that is implemented but unverified is reported waived rather than an open gap (SW-027, SW-030). A spec missing its realizing code is never waived (CON-021). A waiver that waives nothing is reported as stale. Optional. |
| `schemas` | `{ story?: String, "spec"?: String }` | Per-document-type validation schema files; clew validates each document against its type's schema when it reads it (SW-036) — the pinned core merged with the project's required fields and enums (ARCH-007). Optional. |
| `agent` | `{ type: String, skillsDir: String, governanceDir: String, entryFile: String }` | The agent's locations for clew's method: a `type` label naming the agent (for example `claude`), and the skills directory, the governance directory, and the entry file that loads the governance; setup records them so a re-run re-emits to the same locations (SW-043). The `type` is a label only — the engine never branches on it. Defaults to the shipped default (Claude Code's conventions). Optional. |

**Rationale**
Pinning the configuration as an explicit entity fixes the one shape every command reads, and the every-attribute-has-a-default invariant is what lets a project state only what it changes.
Anchoring the resolved-configuration code type to this id makes a divergence between the documented shape and the code shape a compile-time break rather than a silent drift.

**Verification Description**
The resolved-configuration type in the core carries the anchor to this id; removing or renaming the id fails the type-check.
Reading a `.clewrc.json` yields each attribute above, and a missing file or attribute resolves to the documented default.

## Relations

**Related**

- Shown in [the domain-model overview](../domain-model.md) — the entity list and diagram.

## Changes

- **2026-07-12** — Added the `agent` attribute recording the harness the method scaffold was emitted for (STR-031, SW-043), so a re-run re-emits for the same one.
Additive; the entity's shape grew by one attribute, none changed in place.
- **2026-07-17** — Grouped the four filter attributes under the machine each configures: `specSets` → `generation.sets`, `ignore` → `generation.ignore`, `exclude` → `scan.exclude`, `unexclude` → `scan.unexclude` (STR-033).
At the root they named no object — *ignore what? exclude from what?* — and read as near-synonyms despite serving two different corpora in two different units: a regular expression over a spec's filename versus a glob over a repository path.
This changes existing attributes **in place**, which the append-only rule in this entity's description forbids.
It is taken as an explicit, one-off **exception**, not a relaxation of that rule: the rule exists to protect deployed consumers from a breaking change, and there are none — nothing is released, and clew is its own only reader.
The rule stands unchanged and binds again from the first release; moving an attribute after that is a migration, not an edit.
- **2026-08-02** — Widened the `agent` attribute from a bare harness name (a `String`) to the agent's locations (`{ skillsDir, governanceDir, entryFile }`): the method is now emitted to caller-supplied locations, not for a named harness (STR-043; ARCH-008 / ADR-0008 revision).
This changes an attribute's type **in place**, taken as an explicit one-off **exception** on the same grounds as the 2026-07-17 entry — nothing is released, clew is its own only reader — with the append-only rule binding again from the first release.
An old configuration's absent or bare-string `agent` field resolves to the default, so no migration is needed.
