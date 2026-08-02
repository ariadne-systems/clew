# @ariadne-thread/clew

## 0.2.0

### Minor Changes

- bef3bd3: `clew setup` now emits the agent-facing method to caller-supplied **locations** instead of through a per-agent adapter, and names the target agent with `--type`.

  - **`--type <name>`** resolves a known agent's locations from a shipped presets registry — `claude` (the default), `gemini`, `cursor`, `zed`, `amp`, `codex`, `copilot` — so an agent supplies only its own name. `--skills-dir` / `--governance-dir` / `--entry-file` override per field, or stand alone for a custom agent.
  - **Breaking:** `--agent <harness>` is removed, and the configuration's `agent` attribute widens from a bare harness string to `{ type, skillsDir, governanceDir, entryFile }`. An older configuration (an absent or string `agent`) resolves to the default, so no migration is needed.
  - The method is emitted through one generic path that names no target agent — only the presets registry does. The governance stays layered: the entry file (`CLAUDE.md`, `GEMINI.md`, or `AGENTS.md`) lists the `000`–`006`, hard-imported by Claude and Gemini and read as a list by the `AGENTS.md` agents.
  - Integration for Gemini, Cursor, Zed, Amp, Codex, and Copilot ships built to each agent's documented conventions, tested only under Claude Code — feedback welcome.
  - The `clew-setup` skill now wires the generator to the established stack, so the bootstrap stays minimal (`clew setup --type <agent>`) and the configure work is agent-driven.

- 763abcb: Anchor the tool's own implementation and tests to their specs, so the codebase is traced by the mechanism it provides.

  Every software spec, constraint, architecture spec, and non-functional spec (all 37 `SW`/`CON`/`ARCH`/`NF` ids) is now referenced from the code that realizes it and the test that verifies it, using the generated anchoring utility from `@ariadne-thread/trace`:

  - production code is marked with `realizes(id, …)` on the realizing function or value, and the `@realizes(id)` decorator on the realizing class (for example `SequentialIdStrategy`, `OpaqueIdStrategy`, `ClewError`);
  - tests are wrapped in `verifies(id, …)` on the suite that exercises the spec;
  - where a spec relates to more than one id, all of them are anchored.

  `@ariadne-thread/clew` now depends on `@ariadne-thread/trace`. The anchors are inert at runtime — `realizes` returns its value, the decorator is a no-op, `verifies` runs its tests — so behaviour is unchanged; deleting a spec now breaks compilation at every anchor that named it.

- 7f53466: Add the code-anchor scan and the `clew scan` command (STR-016) — the check-side dual of generation (ADR-0005).

  The generator interface gains a `discover` operation beside `generate`: the generator that emits a language's markers now also finds them in source.
  The TypeScript generator implements it as a region-aware lexical scan that ignores comments, strings, template literals, and regex literals, reads only the leading id argument bracket-aware, and derives the spec id from the member name with no lookup into the generated definitions.
  The core drives each configured generator's discover through the interface, applies built-in exclusions (dependency, build, and generator-output directories), and aggregates the anchor locations, sorted and deterministic.
  `clew scan` reports the anchors and writes the locations index atomically, in the shared `locations.json` shape.

  This adds the required `Generator.discover` and `Generator.sourceExtensions` members, which every generator must implement — a breaking change to the generator contract, taken before release.

- 14f0353: Add the `concerns` relation to the generated anchoring utility (ADR-0004).

  Alongside `realizes` and `verifies`, the TypeScript generator now emits `concerns` for code that is coupled to a spec without realizing or verifying it — in the same two forms as `realizes` (a `concerns(ids, value)` wrapper or an `@concerns(ids)` class/method decorator) — plus the `Concerns<Id, T>` type marker beside `Realizes<Id, T>`.

  The type markers now take the same list form as the function markers (`Realizes<[A, B], T>`), so a type or an interface can be anchored in source — a type alias directly, an interface through an `extends` clause or a sibling alias. The generated helper module documents all forms, including that several ids go in one list rather than stacked `extends` clauses (which collide on the marker property).

  `concerns` is existence-checked only — a removed id breaks compilation, but nothing exercises the coupling — so it is weaker than `verifies` and is meant for couplings that are not already implied by a call.

- f95d8fb: Configure generators by type and output directory.

  The `generators` setting in `.clewrc.json` is now a list of `{ type, outputDir }` entries (a bare type string is still accepted as shorthand), so each generator writes into its own directory rather than a single shared one — different targets land in different, language-idiomatic locations.
  `outputDir` is optional; each generator declares a default (for example `src/clew/traceables` for TypeScript) used when the configuration does not set one.
  Generators emit file names only; the core resolves each generator's directory and places its files there.

- 9574755: Add the `clew coverage` command and core coverage computation (STR-018) — the reverse-completeness report (ADR-0005).

  Coverage compares the code anchors (the scan) against the spec traceables and classifies each spec by whether code realizes it and a test verifies it: Covered (both), Realized, Verified, or None; `concerns` never counts (CON-019), and the universe is exactly the traceables the spec command produces, of any lens (CON-020).
  A committed `waivers` list (`{ id, reason }` on `.clewrc.json`, ENT-002) accepts a not-Covered spec, reporting it waived rather than an open gap; a waiver for a Covered or unknown spec is surfaced as stale.
  `clew coverage` writes `coverage.json` in the shared shape — atomic and wholesale — and prints a per-status report. It is informational: it always exits 0, whether or not gaps exist; the pass/fail gate is a later story.

- c6a661d: `clew setup` no longer scaffolds a default `STK-*` coverage waiver; a freshly scaffolded configuration starts with an empty `waivers` list. The default rested on two premises that do not hold: that a stakeholder need cannot be verified by a test (a blanket claim a lens-wide default cannot make — some stakeholder needs decompose into a testable acceptance behaviour, and genuine quality needs are handled by a _per-spec_ waiver, which is the shape uniform coverage already prescribes for a real exception), and that shipping it "keeps the first coverage run honest" (a fresh project has no specs, so its first run is green regardless; the waiver's only later effect is to suppress the coverage gap of an unanchored stakeholder spec — the opposite of honest). A project that genuinely acceptance-verifies a stakeholder need now adds a per-spec waiver deliberately. Existing configurations are unaffected; setup never overwrites an existing `waivers` list.
- f95d8fb: Harden traceable generation (code-review fixes).

  - `clew spec` now prunes the files it generated on a previous run that are no longer emitted — for example when an entire spec set is removed — so a deleted id stops compiling rather than lingering in a stale file (CON-012). Only files carrying the generated marker are removed; hand-written files are never touched.
  - Generated symbol names are sanitized to valid identifiers via a shared core helper, so an unconstrained custom `specSets` name (even one starting with a digit) produces compilable output, and the TypeScript and Java generators name the same traceable identically (both derive it from the spec's filename).
  - The TypeScript anchoring helpers (`realizes`/`verifies`) now take a non-empty list of ids, so an empty anchor — which would silently assert nothing — is a compile error.
  - The Java generator derives its `package` from the resolved output directory (so the file compiles where it lands) and shares the `@ariadne-thread` provenance banner; generators are now told their resolved output directory.
  - An empty configured `outputDir` is treated as unset, falling back to the generator's default location.

- 871206d: The TypeScript generator now emits a `README.md` into its output folder, documenting the markers — the realizes / verifies / concerns relations and the form of each by the kind of element anchored (value, function, class, method, test, type, interface), with examples drawn from a real spec id. An author or agent can read how to anchor from beside the generated symbols rather than from a separate copy that could drift. The helper module's inline overview is reduced to a pointer to the README; the per-symbol JSDoc remains.
- f64133c: Add the `clew promote` command (STR-013).

  `clew promote` finalizes reviewed drafts into the spec tree: for each draft it binds a real id by minting the draft's lens, substitutes that temporary id project-wide — across the spec tree and the drafts location, including already-promoted specs and any unpromoted draft that referenced it — and moves the draft into its configured location renamed to the bound id.
  With no arguments it finalizes all pending drafts; `clew promote <id|path>…` finalizes only the named ones.
  It is the mechanical half of promotion — integration reasoning stays with the user — and it leaves committing to the user.
  An entity draft is a content merge rather than a file move, so it is not finalized; promotion fails fast with `E_ENTITY_DRAFT_UNSUPPORTED`, and a named draft that is not found fails with `E_DRAFT_NOT_FOUND`, rather than acting incorrectly.

- d6b316f: Add configurable scan exclusion — `exclude` and `unexclude` in `.clewrc.json` (STR-017).

  The code scan now reads two glob arrays from configuration and applies them alongside the built-in defaults, which become repository-root-relative globs.
  A bare segment matches only at the root, a leading `**` matches at any depth, and matching is case-sensitive — so a source directory whose name collides with a build convention is no longer dropped wherever it appears.
  Precedence is gitignore-style: a user `exclude` wins, an `unexclude` re-includes a path a built-in default would drop, and a user `exclude` is absolute.
  Exclusion is applied during the walk, before discovery, so an excluded file is never read and an excluded directory is pruned — unless an `unexclude` reaches a path beneath it.
  Every pattern is compiled up front; an uncompilable `exclude` or `unexclude` glob fails the scan with the new `E_INVALID_EXCLUSION_PATTERN` error rather than silently matching nothing.

- 9aa4455: Setup now emits the agent-facing method — the governance baselines and the clew skills — so a scaffolded project is ready for an agent to work rather than a bare configuration a human must complete by hand. The method is held as agent-neutral materials, authored once.

  Alongside this, `clew setup`:

  - **reconciles the method on re-run instead of clobbering it** — each emitted file carries a content hash in its marker, so a re-run updates a file the project has left untouched but preserves one it has edited (CON-033); the marker no longer says "do not edit", and clew's copyright is stripped as each file is emitted, since the method becomes the project's to own;
  - **fills an empty `generators` on a re-run** when `--generator` is passed, so a project scaffolded without a generator can add one (CON-010);
  - seeds a narrative architecture overview at `docs/spec/architecture.md` instead of an agent-context stub (SW-046), and points the next-steps at filling it, drafting a story with the clew-draft skill, and `clew check`.

- 992139a: `clew setup` now scaffolds a runnable configuration instead of a bare skeleton. It takes `--generator <type>` to select and write the target generator (so `clew spec` produces output with no hand-edit; an unknown generator is rejected), scaffolds the default story/spec document schemas and wires the `schemas` section, writes a default `STK-*` coverage waiver so the first `clew check` is honest, and appends the tool's regenerated output to `.gitignore` while keeping `state.json` tracked. Existing configurations, schema files, and `.gitignore` content are never overwritten.
- 0b6756d: Add the `clew spec` command (STR-011).

  The command scans the configured specs into a language-neutral set of traceables — each id tagged with its lens — and delegates emission to the configured language generators through a narrow generator interface, so the core depends on no concrete generator (ARCH-003).
  Each generator produces the traceable symbols, organized into one symbol set per spec set (by lens by default), and the anchoring utility that lets code mark a type, value, or test against a spec id.
  Generation is deterministic and the generated files are tool-owned: re-running on unchanged specs produces byte-identical output (CON-012).
  A configured generator that is not registered fails fast with the new `E_UNKNOWN_GENERATOR` code.

- 8832819: Add configurable spec sets (STR-012).

  A project can declare a `specSets` section — an ordered list of `{ name, pattern }`, where `pattern` is a regular expression over a spec's filename — and `clew spec` emits one symbol set per declared set instead of the default one-set-per-lens.
  The sets partition the traceables: a traceable matching more than one set fails with `E_SPEC_SET_OVERLAP`, and a traceable matching no set fails with `E_SPEC_SET_UNMATCHED` unless a `catchAll` set is configured to collect it.
  An `ignore` list of patterns excludes matching traceables from every set, so no symbol is generated for them.
  With no `specSets` configured, grouping stays one set per lens.

- f95d8fb: Add a class/method decorator form of `realizes`, and move the generated traceables into the `@ariadne-thread/trace` package.

  The TypeScript generator now emits `realizes` as an overload: `realizes(ids, value)` still wraps a value or function, and `realizes(ids)` returns a no-op decorator so a class or method can be anchored as `@realizes(ids)` rather than wrapped. This is the natural marker for classes, which the value form cannot mark cleanly.

  The generated traceables and anchoring utility live in their own workspace package, `@ariadne-thread/trace`, rather than inside the engine — keeping the generated surface out of the engine's public API is why it is a dedicated package. `@ariadne-thread/clew` depends on `@ariadne-thread/trace` for its anchors (for example `SequentialIdStrategy` carries `@realizes(SwTraceables.SW_002_MINT_SEQUENTIAL_IDS)`).

  The decorator is emitted in the TypeScript experimental-decorator form (`experimentalDecorators` is enabled project-wide), because the project's build (rolldown/tsdown) and test (oxc) toolchains lower experimental decorators but leave standard TC39 decorators as raw syntax. The marker is inert at runtime, so the legacy semantics are immaterial; this avoids adding a separate transformer such as SWC.

- f95d8fb: Emit the TypeScript generator's traceable output as per-set string enums plus a helper module (STR-014).

  `clew spec` now generates, in the TypeScript generator's output directory, one file per spec set declaring a string enum whose members are that set's traceables — the member name carries the spec's id and slug (from its filename), the value is the id — with a generated-do-not-edit header naming the set, plus an `index.ts` helper module that re-exports the enums, unions them into a combined `TraceableId`, and exports `Realizes`, `realizes`, and `verifies` constrained to it; `realizes` and `verifies` each accept one member or a list, so a code element can anchor to several specs, mixing sets freely.
  An anchor to a member that no longer exists is a `tsc` error, so a spec removed from the project breaks every anchor to it — existence is enforced by the type-checker.
  A plain (non-`const`) enum is used so the output survives per-file transpilers and bundlers, and its member names give self-documenting call sites and semantic find-references.
  This replaces the skeleton's single-file emission; the output stays deterministic and tool-owned (re-running on unchanged specs is byte-identical).

### Patch Changes

- ca53bff: Repurpose the `clew-setup` skill into the project-bootstrap flow. After the `clew setup` command scaffolds the project, the `clew-setup` skill interviews the user for the stack and the architecture, verifies the current standards from the tools' own docs, fills the `004` technology contract and `docs/spec/architecture.md`, and drafts a workspace-setup story for the agent to execute once the user promotes it — leaving no scaffolded document with an open question. The `clew setup` command's next-steps point to it, and no step tells the user to mint ids by hand.
- de405d9: Harden the emitted agent method — the governance baselines and the clew skills — from a review pass over the contract, the skills, and the CAS-DD article.

  Governance baselines:

  - `000` gains an active-before-anchor step and stop condition, a tie-break for equal-rank `004+` contract files, a scoped no-permission rule that no longer blocks routine local implementation choices, and a note that a reference to an unloaded id is informative only;
  - `001` lets an anchor change when the task requires it, and states traceability holds per completed change set rather than mid-edit;
  - `002`/`003` carry a rationale per rule section;
  - `006` forbids a new `realizes`/`verifies` anchor on a `deprecated` spec and regains its copyright header.

  Skills:

  - `clew-context` gains a lateral-scan step (from each fine-grained local spec, find its other anchors across the codebase) and language-neutral containment terms, separates a conflict from a tension and a gap from a coverage limit, extends read-only to commands, and bounds both reuse and total work;
  - `clew-anchor` guards against a new anchor on a `deprecated` spec and separates "regenerate" from "promote first";
  - `clew-draft` sharpens the clarify gate, adds write-safety, and requires an approval that names the draft set before promotion;
  - `clew-promote` reports a partial state instead of retrying blindly, guards `all`, and records a `## Changes` entry on every edited corpus spec.

- f8d2f9d: Place the method marker after any YAML frontmatter when emitting a method file, so a skill's frontmatter stays on line 1 and is recognized. Previously the `<!-- GENERATED BY CLEW … -->` marker was prepended to every emitted file, which pushed the `---` frontmatter of skill files off the top and made it invisible to Claude Code and other harnesses. The content hash now covers the whole file (frontmatter included), and pre-hash and marker-first files migrate to the corrected form on the next `clew setup`.
- 756b8a9: `clew setup` now scaffolds the example story and spec (`story.example.md`, `spec.example.md`) with id-only relation links: the target is cited by its spec id alone and any explanatory note follows the link, matching the id-only cross-reference rule the check enforces. Previously the examples carried the spec's title inside the link text — the label form the check rejects — which a reader then copied into their first real spec. Each example's comment now names the convention it demonstrates.
- Updated dependencies [7f53466]
- Updated dependencies [d6b316f]
- Updated dependencies [f95d8fb]
  - @ariadne-thread/trace@0.2.0

## 0.1.0

### Minor Changes

- First versioned release (0.1.0): id minting (sequential and temporary), the StateStore, project configuration with lenses and layout, and the `mint`, `init`, and `setup` commands.
