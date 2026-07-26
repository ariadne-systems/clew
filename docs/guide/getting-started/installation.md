# Installation

## Prerequisites

- **Node.js 22 LTS or newer** (`>=22`).
- A generator target for your language.
  clew ships TypeScript and Java generators; each one you configure emits traceables in that language's syntax, and a polyglot project can configure more than one.

## Install the CLI

Install globally to get the `clew` command on your PATH:

```bash
npm install -g @ariadne-thread/clew
```

Or run it without installing, for a one-off:

```bash
npx @ariadne-thread/clew --help
```

Verify the install:

```bash
clew --version
clew --help
```

## From source

clew is developed in the open on GitHub.
To run it from source, clone the repository and install its workspace:

```bash
git clone https://github.com/ariadne-systems/clew.git
cd clew
pnpm install
pnpm dev --help
```

`pnpm dev <command>` runs the CLI from source with tsx.
See the repository's README for the full development toolchain.

## Next

With clew installed, follow the [Quickstart](quickstart.md) to take an empty project to checked coverage.
