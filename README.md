# ariadne-thread

Compile-checked, id-anchored traceability that doubles as scoped agent context.
A single package, `@ariadne-thread/clew` — a language-neutral engine, in-tree
per-language generators behind a narrow interface, and the CLI — distributed via
npm under the `@ariadne-thread` scope.

> Status: early scaffold. No traceability logic yet — see `docs/spec` for the spec and
> `docs/adr/ADR-0001-*` for the architecture decision.

## Packages

| Package | Name | Role |
| --- | --- | --- |
| `packages/clew` | `@ariadne-thread/clew` | The tool: the language-neutral engine (traceables, ids, index, hashing, resolution), the in-tree language generators (Java, TypeScript) behind the generator interface, and the CLI (`clew`) |
| `packages/trace` | `@ariadne-thread/trace` | Generated traceables and anchoring utility (clew run on its own specs) |

The engine reaches every generator through the generator interface, binding the concrete in-tree generators at a single registry point (ADR-0007, revising ADR-0001 D9).

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
