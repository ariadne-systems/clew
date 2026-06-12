# Architecture and constraints

This document is the framing for the CLI.
It is narrative.
This document explains the shape.
The atomic, anchored architecture rules and constraints are authored as ARCH and CON specs when the architecture they constrain is built; those specs are what the code is checked against.

## Shape

The tool is a language-neutral core with pluggable, language-specific generators.

The core deals only in traceables, ids, the index, content hashes, and resolution.
None of this knows a target language.

A generator turns the set of traceable ids into verifiable symbols in one target language and defines how code references a symbol.
Generators sit behind a narrow interface.
Java and TypeScript are the first two.

The core depends on the generator interface, never on a concrete generator.
This boundary is the one that must not erode.

## Enforcement, in three layers

The core anchors ids language-neutrally.
A language-specific generator materializes them as verifiable symbols.
Existence is enforced by the target language's type-checker where one exists, and by a dedicated build check otherwise.

## Runtime

The scanner, generators, resolver, and CLI run on Node and ship via npm.
The tool only writes text; it runs no language runtime of its own.

## Locality

The tool runs fully locally when the spec lives in the repo.
A central authority is needed only when identity must be guaranteed across a boundary a per-repo file cannot cover, such as parallel branches with heavy minting or multiple repos against one source.
