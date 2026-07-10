**Title**
Add a `config` command that prints the resolved project configuration

**Business Value**
Every skill and command already needs the project's *resolved* configuration — the lenses, the valid id prefixes, where artifacts live, and where each generator writes — yet that resolved view exists nowhere a caller can simply read.
`.clewrc.json` is usually partial, so the resolved configuration is the file plus the tool's defaults and derivations; today each skill re-reads the file and re-applies those defaults itself, duplicating the resolution and drifting from it when a default changes.
A `config` command lets the tool answer "what is this project's resolved configuration?" in one place, so authoring skills and humans stop re-deriving it.

**Problem / Context**
The configuration file states only what a project changes; everything else resolves to a default (SW-009), and some values are derived rather than written at all — the valid id prefixes are the lens ids plus the story and entity prefixes (ADR-0003), and a generator's output directory is its configured `outputDir` or, when absent, the generator's own default (SW-014, ENT-002).
So reading the raw file does not give the answer; you have to re-run the tool's resolution.
Several authoring skills each do exactly that, by hand, against a config shape that can change.
There is no command that exposes the resolved view, and `spec` — which does print each generator's resolved output directory — only does so as a side effect of regenerating.

**Solution Approach**
Add a read-only `clew config` command that prints the project's resolved configuration and changes nothing.
The command is thin: it requires a configuration (CON-011), builds the generator registry — so a generator's default output directory can be resolved — and delegates to core, which assembles the resolved view from the section readers, the derived prefixes, and each generator's resolved output directory, then prints it; a `--json` form emits the same view machine-readably for an agent.
Resolving the configuration is a single core behaviour the skills and the command call, rather than logic re-implemented per skill; the command adds no resolution of its own, mirroring how `spec` delegates to core.

**Affected specs and artifacts**
- The `cli` package gains a `config` command that delegates to core and prints the resolved view, human-readable and `--json`.
- The `core` package gains a behaviour that resolves the full configuration into one view — lenses, prefixes, layout, and generators with resolved output directories — composing the existing section readers (SW-009) and resolving each generator's output directory through the generator interface (ARCH-003), so the core stays free of any concrete generator.
- New `SW` specs for the command surface and the resolution behaviour, and a new `CON` that the command is read-only.

**Acceptance Criteria**
- `clew config` prints the resolved configuration: the lenses, the valid id prefixes, the layout directories and files, and each configured generator with its resolved output directory.
- A partial or absent-section configuration still prints the resolved values — the defaults appear, not blanks.
- `--json` prints the same resolved view as machine-readable JSON.
- The command writes no file, advances no state, and regenerates nothing.
- A configuration is required (CON-011); with none present the command fails toward `setup` and changes nothing.
- Vitest covers: the resolved view over a partial config (defaults shown); a generator's output directory resolved to its default when unset; the `--json` shape; that running the command produces no filesystem or state change.

**Decisions** (resolved)
- **Requires a configuration** — `config` describes *this project's* resolved configuration, so it follows CON-011 like `init`/`spec`/`promote` rather than printing the bare defaults with no project.
- **Resolution lives in core, not the command** — the resolved view is a reusable core behaviour the skills can also call, not formatting logic trapped in the CLI.
- **Output directory is resolved, not raw** — the printed generator directory is the configured value or the generator's default, since the resolved directory is what callers need.

**Implementation notes**
- The resolve behaviour belongs next to the existing section readers in core, composing `readLenses`, `readLayout`, `readConfiguredPrefixes`, and `readGenerators` rather than re-reading the file.
- Resolve each generator's output directory the same way `spec` already does — the configured `outputDir` or, when unset, the generator's `defaultOutputDir` on the generator interface (ARCH-003) — so the two commands share one resolution rule and the core stays free of any concrete generator.
- The command mirrors the `spec` command: require the configuration, build the generator registry in the CLI as the composition root, then delegate to core.

**Out of scope**
- A dedicated affordance to print *only* the traceables directory — the resolved view already carries it.
- Editing or writing configuration — `config` is read-only; scaffolding is `setup`.
- Printing the resolved configuration when no project configuration exists (the all-defaults view).
- The index/resolver that answers "what relates to this id" — a separate concern.

## Relations

**Realizes**

- [SW-020 — The tool exposes a `config` command that prints the resolved configuration](../derived-specs/SW-020-config-command.md)
- [SW-019 — The tool resolves the project configuration into a single view](../derived-specs/SW-019-resolve-configuration.md)
- [CON-015 — The `config` command is read-only](../derived-specs/CON-015-config-read-only.md)

This story builds on the configuration readers (SW-009), mirrors the `spec` command's shape (SW-012), and reuses the configuration precondition (CON-011) and the generator interface (ARCH-003).

## Changes

- **2026-07-08** — Superseded in part by ADR-0007 (STR-028): the generator registry moved from the CLI (the "composition root" this story describes) into the engine, and `resolveConfiguration` now resolves a generator's default output directory through the built-in registry by default.
The `config` command no longer builds or injects the registry; it delegates to core with no arguments. The command's behaviour and read-only contract are unchanged.
