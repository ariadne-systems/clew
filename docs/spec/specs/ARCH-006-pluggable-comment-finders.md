**Title**
Comment detection is a generator capability

**Lens**: ARCH

**Status**: active

**Description**
Identifying what is a comment — so it can be scanned for a stray spec-id token — is language-specific, the same lexical knowledge a generator already uses to discover markers.
So clew makes comment detection an operation of the generator contract (ARCH-003), not a separate registry: a generator classifies its language's source into code and comment regions, and the spec-id-in-comment check reads comments through that.
A language gains comment detection by implementing the generator — the same way it gains generation and discovery — with no separate finder to register and no second comment scanner in the core.

**Rationale**
Comment syntax varies by language (`//`, `/* */`, `#`, `--`, `<!-- -->`, …); baking one language's rules into the check would miss comments in other languages, or misread code (a `//` inside a string) as a comment.
Putting comment detection on the generator keeps it correct across languages and reuses the lexer the generator already has for discovery — one classifier per language, not two — so the comment check inherits every language the project already generates for.
A core-owned registry of comment finders, separate from the generators, would drift from them: a language with a generator but no registered finder would be silently unscanned, and the core would carry a second, weaker lexer.

**Verification Description**
A comment in a generated-for language is recognized and scanned through that language's generator; a construct that is not a comment in that language is not scanned.
A language the project generates for is scanned for spec-id-in-comment with no separate finder registered; there is no language that has a generator but no comment detection.

## Relations

**Realizes**

- [SYS-014](SYS-014-detect-references-bypassing-anchor.md)

**Related**

- Part of [ARCH-003](ARCH-003-generator-interface.md): comment identification is one operation of the generator contract, beside generation and discovery.
- [SW-033](SW-033-flag-spec-id-in-comment.md) finds comments through the generator's comment identification.

## Changes

- **2026-06-29** — Reframed from a separate, core-owned registry of per-language comment finders to an operation of the generator contract (ARCH-003): a generator identifies its own comments, reusing the lexer it already uses for discovery.
A separate registry drifts from the generators — a language with a generator but no registered finder is silently unscanned — and duplicates the generator's lexer in the core.
