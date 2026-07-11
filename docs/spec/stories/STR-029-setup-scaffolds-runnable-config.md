**Title**
`clew setup` scaffolds a runnable configuration

**Business Value**
Today `clew setup` writes only the configuration skeleton — the lenses and the layout (SW-011).
A project scaffolded that way cannot run the loop: `clew spec` emits nothing because no generator is configured, and no story or spec is validated because no schemas are present.
This story makes setup write a configuration the tool can immediately run against — a generator chosen and the document schemas wired — so `clew spec` and `clew check` work from the first command instead of after a hand-edit.

**Problem / Context**
SW-011 scaffolds only the default lenses and layout into `.clewrc.json`; it leaves the `generators` and `schemas` sections (ENT-002) empty.

- The generator is a per-project choice (Java vs TypeScript) that setup cannot currently make.
With none configured, `clew spec` (SW-014) produces no output, so a scaffolded project cannot generate its traceables until the config is hand-edited.
- With no `schemas` section, no document is validated (SW-036), so a malformed story or spec is caught only later, by hand.

Both gaps have to be closed manually today, at the exact moment a project is being established.

**Solution Approach**
Extend the scaffolding that SW-011 performs, keeping the command thin (SW-010) — it delegates to core and reports.

1. **Generator selection.**
The command gains a `--generator <type>` option; setup writes the chosen generator into the config's `generators` section.
The clew-setup skill asks the human which generator, exactly as it asks which lenses — the interactive choice is the skill's, the option is the command's, and the default is none (setup does not guess a target language).

2. **Default schemas.**
Setup writes the default story/spec document-schema files — the fixed opinionated template (ADR-0001 D8) — and wires the `schemas` section, so document validation works from the first read.

3. **Ignore the tool's regenerated output.**
Setup contributes the tool's `.gitignore` entries — ignoring the regenerated scan index (`.clew/locations.json`) and coverage report (`.clew/coverage.json`) while keeping the state file (`.clew/state.json`) tracked (CON-001) — appended without rewriting an existing `.gitignore`, so the project is committable without hand-sorting which tool files to track.

4. **An honest first coverage run.**
Setup writes a default stakeholder-lens waiver (`STK-*`), so the first `clew check` reports stakeholder specs — verified by acceptance, not by tests — as waived rather than as gaps that cannot be closed.

All four obey CON-010: setup writes or appends only what is absent and never rewrites an existing configuration, schema, or `.gitignore`.
The configuration entity shape does not change — `generators`, `schemas`, and `waivers` already exist in ENT-002; what changes is what setup *writes*.

The agent-facing half of the method — the governance baselines and the clew skills — is a follow-up story, out of scope here.

**Affected specs and artifacts** (planned; ids bound on promotion)
- SW — setup selects the target generator(s) at scaffold time and writes them into the config, driven by a `--generator` option; extends SW-011, revises SW-010's surface.
- SW — setup scaffolds the default document schemas and wires the `schemas` section (the fixed template, ADR-0001 D8); sibling to SW-011.
- SW — setup contributes the tool's `.gitignore` entries, ignoring the regenerated scan and coverage output while keeping the state file tracked; sibling to SW-011.
- SW — setup writes a default stakeholder-lens waiver so the first coverage run is honest; sibling to SW-011.

**Acceptance Criteria**
- `clew setup --generator typescript` writes a `.clewrc.json` whose `generators` includes the chosen generator; `clew spec` then produces generator output with no further edit.
- `clew setup` with no `--generator` writes a configuration with an empty `generators` and reports that none was selected.
- `clew setup --generator <unknown>` exits non-zero and writes nothing.
- Setup writes the `schemas` section pointing at scaffolded story/spec schema files; a minimal story and a minimal spec validate, and a document missing a pinned field is rejected (SW-036).
- After setup, `.gitignore` excludes `.clew/locations.json` and `.clew/coverage.json` and does not exclude `.clew/state.json`; an existing `.gitignore` gains only the missing entries and is otherwise unchanged.
- After setup, the configuration's `waivers` contains a `STK-*` entry, and `clew check` reports a stakeholder spec that is realized but untested as waived, not as an open gap; an unimplemented stakeholder spec is still an open gap (CON-021).
- Re-running setup leaves an existing configuration, existing schema files, and an existing `.gitignore` byte-for-byte unchanged (CON-010).
- Vitest covers: the generator written from the option; an unknown generator rejected before any write; schemas scaffolded and wired; the `.gitignore` entries appended without duplication; the default stakeholder waiver written; idempotency (no overwrite of an existing config, schema, or `.gitignore`).

**Out of scope**
- The agent-facing method scaffold — the governance baselines, the clew skills, and the project stubs — which is a separate follow-up story.
- Changing the configuration entity shape — `generators` and `schemas` already exist in ENT-002; this story changes what setup writes, not the entity.
- The interactive prompting — which generator — is the clew-setup skill's job; this story specs the command surface and the scaffolding, not the prompts.

## Relations

**Realizes**

- [SW-039 — Setup selects the target generator and writes it to the configuration](../specs/SW-039-setup-selects-generator.md)
- [SW-040 — Setup scaffolds the default document schemas and wires them](../specs/SW-040-setup-scaffolds-schemas.md)
- [SW-041 — Setup ignores the tool's regenerated output and keeps state tracked](../specs/SW-041-setup-ignores-tool-output.md)
- [SW-042 — Setup waives the stakeholder lens from test coverage by default](../specs/SW-042-setup-waives-stakeholder-lens.md)

**Related (existing corpus)**

- Extends [SW-011 — Scaffold the default configuration and layout](../specs/SW-011-scaffold-default-config.md): scaffolding grows from lenses+layout to a runnable configuration.
- Revises the surface of [SW-010 — The tool exposes a `setup` command that delegates to core](../specs/SW-010-setup-command.md): the command gains the `--generator` option.
- The chosen generator is consumed by [SW-014 — Generate traceables through the configured generators](../specs/SW-014-generate-traceables.md), and the schemas by [SW-036 — Reading a document validates it against its type's schema](../specs/SW-036-scan-validates-schema.md).
- Writes the `generators` and `schemas` sections of [ENT-002 — Configuration](../domain-model.md#ent-002-configuration) without changing its shape.
- Realizes the same system need as SW-010/SW-011: [SYS-004 — Configuration and state](../specs/SYS-004-configuration-and-state.md).
