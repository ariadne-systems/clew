# ariadne-thread

Compile-checked, id-anchored traceability that doubles as scoped agent context.
A language-neutral core with pluggable, per-language generators, distributed via npm
under the `@ariadne-thread` scope.

> Status: early scaffold. No traceability logic yet — see `docs/spec` for the spec and
> `docs/adr/ADR-0001-*` for the architecture decision.

## Packages

| Package | Name | Role |
| --- | --- | --- |
| `packages/core` | `@ariadne-thread/core` | Language-neutral core: traceables, ids, index, hashing, resolution |
| `packages/cli` | `@ariadne-thread/cli` | Command-line interface (`ariadne`) |
| `packages/gen-java` | `@ariadne-thread/gen-java` | Java generator |
| `packages/gen-typescript` | `@ariadne-thread/gen-typescript` | TypeScript generator |

The core never depends on a concrete generator (ADR-0001 D9).

## Toolchain

pnpm workspaces · TypeScript (ESM, NodeNext) · tsdown (build) · tsx (dev) ·
Vitest (test) · Biome (lint + format) · changesets (versioning) ·
publint + are-the-types-wrong (package checks) · lefthook (git hooks).

Node 22 LTS is the supported floor.

## Commands

| Command | Does |
| --- | --- |
| `pnpm install` | Install the workspace |
| `pnpm build` | Build every package with tsdown (ESM + d.ts) |
| `pnpm typecheck` | `tsc --noEmit` across the workspace |
| `pnpm test` | Run Vitest |
| `pnpm lint` | Lint with Biome |
| `pnpm format` | Format with Biome (`--write`) |
| `pnpm check:pkg` | Validate publishable packages (publint + attw) |
| `pnpm dev` | Run the CLI from source with tsx |

`pnpm build` should be run before `pnpm typecheck`, `pnpm test`, and `pnpm check:pkg`,
since packages resolve each other through their built output.
