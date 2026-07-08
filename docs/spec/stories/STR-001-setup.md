**Title**
Set up the ariadne-thread-cli monorepo and toolchain

**Business Value**
A clean project skeleton lets every later feature be built, typed, tested, and linted from day one.
It establishes the package layout and conventions that the SRDD work and the architecture rules will build on.

**Problem / Context**
The repository is empty.
Before any traceability logic is written, the project needs a monorepo layout and a current Node toolchain.
The tool is a language-neutral core with pluggable, per-language generators, distributed via npm under the `@ariadne-thread` scope.

**Solution Approach**
Use a pnpm workspace monorepo, TypeScript, ESM only.
Node 22 LTS is the supported floor (engines `>=22`); develop against the current Node 24 LTS.
Packages: `@ariadne-thread/core` (language-neutral), `@ariadne-thread/cli`, `@ariadne-thread/gen-java`, `@ariadne-thread/gen-typescript`.
Toolchain, all latest stable: pnpm for workspaces, tsdown for building (not tsup, which is unmaintained), tsc for type-checking only, tsx for running TypeScript in dev, Vitest for tests, Biome for lint and format (not ESLint or Prettier), changesets for versioning and publishing.
publint and `@arethetypeswrong/cli` (attw) validate that each publishable package ships correct ESM and type declarations.
CLI uses commander for argument parsing and picocolors for output; pino is available for diagnostic logging to stderr.
Do not add business logic; this story only establishes the scaffold and the checks.

**Acceptance Criteria**

Repository and workspace
- A pnpm workspace is defined at the repo root via `pnpm-workspace.yaml`, covering a `packages/*` layout.
- The root `package.json` sets `"type": "module"`, `"private": true`, and `"engines": { "node": ">=22" }`.
- `pnpm install` completes cleanly.

Packages
- Four packages exist under `packages/`: `core`, `cli`, `gen-java`, `gen-typescript`, named `@ariadne-thread/core`, `@ariadne-thread/cli`, `@ariadne-thread/gen-java`, `@ariadne-thread/gen-typescript`.
- Each package has its own `package.json`, a `tsconfig.json` extending a shared strict base, and a `src/index.ts` exporting a placeholder.
- `cli`, `gen-java`, and `gen-typescript` each declare a dependency on `core` for their placeholder import.
- Publishable packages set `"publishConfig": { "access": "public" }`.
- Publishable packages define an `exports` map with `types` and `import` conditions and set `"sideEffects": false`.

TypeScript
- A shared `tsconfig.base.json` enables strict mode, `"moduleResolution": "nodenext"`, and `"isolatedDeclarations": true`.
- `pnpm typecheck` runs `tsc --noEmit` across the workspace and passes.

Build
- `pnpm build` builds every package with tsdown and emits ESM plus type declarations.
- The `cli` package exposes a `bin` entry that runs and prints help and version via commander.
- `pnpm check:pkg` runs publint and `@arethetypeswrong/cli` against the publishable packages and passes.

Tests
- Vitest is configured at the repo root via `test.projects` (the standalone workspace file is deprecated since Vitest 3.2); per-package configs extend a shared `vitest.shared.ts`.
- `core` contains one trivial placeholder function with a passing test, so `pnpm test` is green.

Lint and format
- Biome is configured with one root config.
- `pnpm lint` and `pnpm format --check` pass on the scaffold.

Developer entry points
- The root `package.json` exposes scripts: `build`, `typecheck`, `test`, `lint`, `format`, `check:pkg` (publint + attw), and `dev` (tsx).
- A root `README.md` lists these commands and the package layout.

Optional, if cheap
- A `lefthook` pre-commit hook runs Biome and typecheck.
- changesets is initialized for later publishing.

**Out of scope**
- No scanner, mint, resolver, index, or generator logic.
- No architecture-boundary enforcement; the rule that keeps `core` free of language-specific generators is its own ticket, modeled as an ARCH spec with its enforcement.
- No spec tokens or SRDD wiring; that comes in the next story.

## Changes

- **2026-07-08** — Superseded in part by ADR-0007 (STR-028): the four-package layout this story scaffolded — `@ariadne-thread/core`, `@ariadne-thread/cli`, `@ariadne-thread/gen-java`, `@ariadne-thread/gen-typescript` — was consolidated into a single package, `@ariadne-thread/clew`, with the generators as in-tree modules behind the generator interface and the CLI as its presentation layer and bin; `@ariadne-thread/trace` remains separate.
The scaffold's intent — a pnpm / TypeScript / ESM workspace with the toolchain and checks — stands; only the package count and names changed.
