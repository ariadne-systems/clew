**Title**
Setup selects the target generator and writes it to the configuration

**Lens**: SW

**Status**: active

**Description**
Setup accepts the target generator as a `--generator <type>` option and writes the chosen generator into the scaffolded configuration's `generators` section (ENT-002), so a generator is configured from the first run.
Given no `--generator`, setup writes a configuration with an empty `generators` — the current behaviour (SW-011) — and reports that none was selected, rather than guessing a target language.
The option's value is a generator `type` the registry knows; an unknown type is rejected with a non-zero exit before any file is written, so setup never leaves a half-written configuration behind.

**Rationale**
With no generator configured, `clew spec` produces nothing (SW-014), so a scaffolded project cannot generate its traceables until a generator is added by hand.
Making the generator a setup-time choice closes that gap at the one moment the project is being established, while defaulting to none keeps setup honest for a project that has not yet chosen a target language.

**Verification Description**
`clew setup --generator typescript` writes a `.clewrc.json` whose `generators` contains the `typescript` generator, and `clew spec` then produces output with no further edit.
`clew setup` with no `--generator` writes a configuration with an empty `generators` and reports that none was selected.
`clew setup --generator <unknown>` exits non-zero and writes no configuration.

## Relations

**Realizes**

- [SYS-004](SYS-004-configuration-and-state.md)

**Related**

- Extends [SW-011](SW-011-scaffold-default-config.md): the scaffolded configuration now carries a generator.
- Revises the surface of [SW-010](SW-010-setup-command.md): the command gains the `--generator` option.
- The written generator is consumed by [SW-014](SW-014-generate-traceables.md).
- Writes the `generators` section of [ENT-002](../domain-model.md#ent-002-configuration).

## Changes

- **2026-07-10** — Set active: implementation of STR-029 began.
