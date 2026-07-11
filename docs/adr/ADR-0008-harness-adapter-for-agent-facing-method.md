# ADR-0008: The agent-facing method is emitted through per-harness adapters

- Status: Accepted.
- Date: 2026-07-10
- Deciders: project maintainer.
- Relates to: ADR-0001 D8 (opinionated template), ADR-0007 (in-tree implementations behind a narrow interface).
- Introduces specs: an ARCH boundary (harness-adapter interface) and the SW/CON that realize it, authored in the method-scaffold story.

## Context

`clew setup` scaffolds the configuration but not the method.
The method has two halves.
One is mechanical — the config, the schemas, the generator — which the tool already knows how to write.
The other is the **agent-facing** half: the generic governance contract (the `000`–`003` and `006` baselines) and the clew skills (setup, draft, context, promote, anchor).
That half lives in this repository and is not shipped by setup, so a fresh project has none of it and a human copies it in by hand.

The agent-facing method is **harness-neutral in content but harness-specific in materialization**.
The governance text and the skill logic are the same whatever agent works the project.
Where those materials land, and in what form, is not: an agent running under Claude Code reads skills from `.claude/skills/<name>/`, governance from a loaded context directory, and an index at `CLAUDE.md`; other harnesses read an equivalent set from their own locations under their own conventions.
Same method, different placement and packaging per harness.

This is structurally the generator problem again.
Generation has one neutral model (the traceables) emitted into many target languages through a narrow interface, resolved from in-tree implementations at a single registry (ADR-0001 D9, as revised by ADR-0007).
The method has one neutral content set emitted into many harnesses.
The shapes match; the open question is only whether to solve it the same way or to special-case the single harness in front of us.

## Decision

### D1 — A harness-adapter interface over neutral method materials

The agent-facing method is modelled as **harness-neutral method materials** — the governance baselines and the skills as content, with no harness path or format baked in — plus a **`HarnessAdapter`** interface whose one job is to write those materials into a given harness's locations and conventions.
Setup resolves the configured adapter and hands it the materials; the adapter materializes them.
The neutral materials are authored and maintained once; a harness is one adapter, not a second copy of the method.

### D2 — In-tree adapters, bound at a single registry point

The adapters are in-tree modules, resolved from an in-package registry that names them directly, exactly as ADR-0007 resolved the generators.
The engine references a concrete adapter at exactly one point — the registry — and an architecture test enforces that nothing else names one, the same rule already guarding the generators.

Rationale.
This is a deliberate consistency decision.
The codebase should carry **one** pattern for "neutral core, pluggable emission," not a package boundary for generators and a different mechanism for harnesses.
TypeScript still offers no service-provider mechanism (ADR-0007 Context), so an in-tree registry is the idiomatic resolution here too; the third-party path, if it is ever wanted, is the same additive config-named dynamic import ADR-0007 D3 describes.

### D3 — Claude first; other harnesses deferred, not foreclosed

One concrete adapter ships now: Claude Code.
The interface exists so a second harness is an additive change — one more in-tree adapter and one registration line — not a rewrite, and the neutral materials do not move.
No other adapter is authored until it is needed; the interface is the option value, kept for the same reason ADR-0007 D2 kept the generator interface.

The materials must therefore stay genuinely harness-agnostic.
A Claude assumption that leaks into the neutral content — a hard-coded `.claude` path, a Claude-only front-matter field — defeats the interface, so the boundary is only as good as the neutrality of what flows across it.

### D4 — Emitted method files are tool-owned and re-emittable; project files are never clobbered

The materialized method files are **tool-owned**: marked as generated, re-emitted whole on each setup run, and never hand-edited — CON-012's rule for generated traceables, applied to the method scaffold.
Re-running setup refreshes the method to the tool's current version.
It never overwrites a **project-owned** file — the configuration (CON-010), the project stubs, or any spec — so a re-run is always safe.
The method is the tool's to keep current; the project's own content is the project's, and setup does not touch it once it exists.

### D5 — clew ships the method, never the project's content

The boundary D4 draws by ownership is the same boundary the scaffold draws by authorship.
clew ships the **method** — the generic, tool-owned governance baselines and skills — and never authors the project's **content**.
The project-specific contracts (the `004` technology contract, the `005` testing contract, the `architecture.md`) are scaffolded once as clearly-marked stubs and then belong to the project; they are seeded, not re-emitted, and the tool never writes over them.
A generic baseline is the tool's to improve and re-emit; a stub is the project's to fill.

### D6 — The method materials ship as package assets, sourced from clew's own governance

The neutral method materials are not inlined into the built bundle as string constants; they ship as **asset files** in the `clew` package and are read at runtime.
The generic half — the governance baselines (`000`–`003`, `006`) and the clew skills — is populated at build time by copying clew's own canonical governance and skills (`.claude/.ai-project-context/*`, `.claude/skills/*`) into the package's assets, so there is one source of truth and the tool ships the exact method it dogfoods on itself.
The project stubs (`004`, `005`, `architecture.md`) ship as skeleton templates, not clew's own filled-in versions.

Concretely: the package's `files` list includes the assets directory beside `dist`; a prepublish build step copies the canonical sources in (the bundler emits only JS); each adapter resolves its assets relative to the package through `import.meta.url`; and a package smoke-check confirms they resolve from the installed layout, not only in the dev tree.

Rationale.
The skills and governance are large, multi-file markdown and are already clew's own dogfooded files; inlining them as string constants would duplicate that source and drift on every edit.
Shipping them as assets keeps one source and makes "clew ships the method" literal.
The boundary is duplicated-and-multi-file → asset, small-and-unique → inline: the schema templates a project scaffold already writes (a single opinionated file each, duplicated nowhere) stay inlined, and the asset machinery is not spent on them.

## Relationship to existing specs

This ADR reverses nothing, so it revises no existing spec's meaning.
It **adds**: the `HarnessAdapter` boundary is a new ARCH spec, and its realization is new SW and CON, all authored in the method-scaffold story that cites this ADR.

- **ARCH-003 (generator interface)** is the acknowledged precedent, not a revision; the harness adapter is its sibling on a different axis and reuses its in-tree, registry-bound, arch-test-enforced resolution (D2).
- **CON-012 (generated files are tool-owned)** is the precedent for D4; the method scaffold's tool-owned rule is the same rule on a new artifact, stated as its own CON because it governs a different output tree.
- **CON-010 (setup never overwrites)** is honoured, not changed; D4 extends the never-clobber guarantee from the configuration to every project-owned file setup can touch.

## Consequences

Positive.
Setup can produce a project whose method is present and immediately workable, not a config stub a human must complete.
The method is portable: the same neutral materials reach any supported harness, and adding one is one adapter behind the interface.
Method improvements ship by re-emission, the same way traceable improvements do.

Negative and risks.
The engine now carries "harness" as a first-class concept it did not have before, and the neutral materials must be kept honestly harness-agnostic or the interface rots (D3).
Tool-owned method files cannot be locally customized — by design: customization is the project's content (D5), not the generic method.
Only Claude is materialized now, so the neutrality of the materials is asserted against a single adapter and is not proven until a second one exists — a known, bounded risk the interface is meant to absorb.
Shipping the materials as assets (D6) adds a build-time copy and runtime asset resolution the bundler does not cover, so a package smoke-check — not only publint and attw — is needed to catch a missing or mislocated asset in the installed package.

Reversibility.
As with ADR-0007, the interface seam is what keeps this cheap to revisit.
More harnesses, or the third-party dynamic-import path, are additive on top of a preserved contract, not a teardown.
