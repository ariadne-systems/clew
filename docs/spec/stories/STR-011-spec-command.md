**Title**
Add an `ariadne spec` command that generates traceables via language-specific generators

**Business Value**
The tool's promise is compile-checked traceability, but nothing yet turns a spec into the verifiable symbol that binds code to it.
`ariadne spec` is that step: it scans the specs for their ids and has the configured language generators materialize each id as a symbol — and the utility files around it — that the target compiler can check, so deleting or renaming a spec breaks the build of the code that references it.
This is the mechanism the whole approach rests on; without it, ids are just text and the trace is unenforced.

**Problem / Context**
Specs carry stable ids, and code can reference them by id — but only once each id exists as a verifiable symbol in the target language (a generated constant the compiler resolves).
No command produces those symbols.
The generator packages (`gen-java`, `gen-typescript`) are scaffolds, and the generator interface the core depends on is not yet defined.
So the forward link — declared in a spec, implemented in code, enforced by the type-checker — cannot be established.

**Solution Approach**
Add `ariadne spec`.
It **scans** the configured artifacts for their traceable ids, language-neutrally: that is the core's job — read the specs, and produce the set of traceables (at least each id, and the content it was anchored against, for later currency checks).
It then **delegates** emission to each configured generator through a narrow generator interface: the core hands the generator the set of traceables, and the generator produces the verifiable symbols and the accompanying **anchoring utility** — the helpers, constrained to those symbols, that let code mark a type, a value, or a test against a spec id — in its target language, and defines how code references a symbol.
The core depends only on the interface, never on a concrete generator — the boundary that must not erode (ADR-0001 D9).
Generation is deterministic and idempotent: re-running on unchanged specs produces identical output.
Generated files are tool-owned and not hand-edited.
The command requires a configuration and runs the generators listed under `generators`.
This story builds the **skeleton** — the command, the scan, the generator interface, and the generators as skeleton implementations — not a complete generator for any language; checking that anchored code stays current, and building coverage from the code side, is a separate, later command.

**Affected specs and artifacts**
- `SW-012` — the `spec` command surface (thin; delegates).
- `SW-013` — scan the configured artifacts into the set of traceables (language-neutral).
- `SW-014` — generate the traceables and anchoring utilities through the configured generators.
- `ARCH-003` — generation behind a narrow generator interface; the core never depends on a concrete generator (ADR-0001 D9; sibling to ARCH-001).
- `CON-012` — generated traceables and utilities are tool-owned and deterministic.
- Reuses `CON-011` — a command requires a configuration.
- The generator packages (`gen-java`, `gen-typescript`) implement the interface as skeletons.

**Acceptance Criteria**
- `ariadne spec` scans the configured artifacts and, for each configured generator, produces the traceable symbols and utility files for every spec id found.
- The emitted symbol set matches the spec ids one-to-one: an id removed from the specs removes its symbol on the next run; an id added adds one.
- The core selects and invokes generators through the interface only — it contains no language-specific emission and references no concrete generator type.
- Re-running with unchanged specs produces identical output (idempotent).
- With no configuration present, the command directs the user to `setup`, like the other commands.
- Vitest covers: scanning a fixture spec tree into the expected traceable set; the command driving a fake generator through the interface with that set; idempotency; and the core referencing no concrete generator.

**Decisions** (resolved)
- "Utility" is the **anchoring means**: the helpers, type-constrained to the generated traceables, that let code mark a type, value, or test against a spec id (the equivalent of annotations). The generator emits both the traceables and this utility.
- The command is **`spec`** (short). It is the *declare* side — specs → traceables + utility; a separate, later command is the *check* side — it scans the code locations and builds coverage and drift. The two names stay distinct on purpose.
- This story builds the **skeleton only**: the command, the scan, the generator interface, and the generators as skeleton implementations — no complete generator, and **no language-specific spec**.
- The generated symbols are organized into **spec sets** — one symbol set (enum) per set, not a single flat union. A spec set is a *configured* grouping of traceables (a matcher over the spec id), with grouping by **lens** as the default. The frame here is kept set-aware: each traceable carries its id and lens, and the generator interface passes them grouped and emits one set per spec set. Defining the spec sets — the matchers, exclusion, and partition rules — is the follow-on story `STR-012`; this story does not build that, but does not preclude it.

**Out of scope**
- The committed index (id → locator + content hash) and resolution — a related but separate capability (ADR-0001 D4).
- The reverse-direction completeness check, implemented-but-not-declared (ADR-0001 D6) — its own concern.
- Content-hash drift checking — depends on the index.
- The full shape of each generator's Java/TypeScript output beyond the interface contract and a first working emission; generator-specific detail can be iterated.
- Defining spec sets — the matchers, exclusion (ignore) patterns, and partition/completeness rules — is the follow-on story `STR-012`. The frame here is set-aware (traceables carry their id and lens; the generator emits one set per spec set), so it is not precluded.

## Relations

**Realizes**

- [SW-012 — The tool exposes a `spec` command that delegates to core](../derived-specs/SW-012-spec-command.md)
- [SW-013 — Scan the configured artifacts into the set of traceables](../derived-specs/SW-013-scan-traceables.md)
- [SW-014 — Generate traceables and anchoring utilities through the configured generators](../derived-specs/SW-014-generate-traceables.md)
- [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](../derived-specs/ARCH-003-generator-interface.md)
- [CON-012 — Generated traceables and utilities are tool-owned and never hand-edited](../derived-specs/CON-012-generated-files-tool-owned.md)
