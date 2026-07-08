<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# AI Technology Contract

This document defines runtime and dependency constraints.

---

## 1. Runtime

- Node.js — 22 LTS is the supported floor (`engines: ">=22"`); develop on the current 24 LTS.
- pnpm workspace monorepo (pnpm 11+).
- TypeScript 6 — ESM only; `module`/`moduleResolution` NodeNext; `strict`; `isolatedDeclarations`.
- tsdown builds (ESM + `.d.mts`); `tsc --noEmit` type-checks only; tsx runs TypeScript in dev.

---

## 2. Packages

| Package | Responsibility |
| --- | --- |
| `@ariadne-thread/clew` | The tool: the language-neutral engine (traceables, ids, index, hashing, resolution, state; domain entity types in `clew/src/entities`), the in-tree language generators behind the generator interface (`clew/src/generators`, one per target language), and the CLI presentation layer and bin (`clew`, `ariadne`). |
| `@ariadne-thread/trace` | The generated traceables and anchoring utility, emitted by running clew on its own specs and imported by the code under trace. |

The engine reaches every generator through the generator interface, binding the concrete in-tree generators at a single registry point (`clew/src/generators/registry.ts`); an architecture test enforces that nothing outside `clew/src/generators` names a concrete generator (ADR-0007, revising ADR-0001 D9).
The CLI is presentation only — each command delegates to the engine.
The `trace` package holds generated output only and stays separate.

---

## 3. Approved Libraries

Build and quality:

- tsdown (build), tsx (dev runner)
- Vitest (tests)
- Biome (lint + format) — not ESLint or Prettier
- changesets (versioning / publishing)
- publint + `@arethetypeswrong/cli` (package checks)
- lefthook (git hooks)

Runtime:

- commander, picocolors, pino (CLI)
- proper-lockfile (engine state locking)
- yaml (engine document-schema parsing) — schemas are hand-authored YAML (`.ariadnerc.json` stays JSON); justified in STR-026.

Do not introduce alternative libraries (for example tsup, ESLint, Prettier, Jest) without explicit justification.
