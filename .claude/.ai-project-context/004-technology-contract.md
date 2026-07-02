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
| `@ariadne-thread/core` | Language-neutral core: traceables, ids, index, hashing, resolution, state. Domain entity types live in `core/src/entities`. |
| `@ariadne-thread/cli` | Bin-only CLI (`ariadne`); presentation only — each command delegates to core. |
| `@ariadne-thread/gen-java` | Java generator, behind the generator interface. |
| `@ariadne-thread/gen-typescript` | TypeScript generator, behind the generator interface. |

Business logic belongs only in `core`.
The core depends on the generator interface, never on a concrete generator (ADR-0001 D9).

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
- proper-lockfile (core state locking)
- yaml (core document-schema parsing) — schemas are hand-authored YAML (`.ariadnerc.json` stays JSON); justified in STR-026.

Do not introduce alternative libraries (for example tsup, ESLint, Prettier, Jest) without explicit justification.
