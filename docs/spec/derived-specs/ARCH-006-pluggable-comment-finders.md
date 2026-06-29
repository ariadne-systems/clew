**Title**
Comment detection is delegated to pluggable per-language comment finders

**Lens**: ARCH

**Status**: active

**Description**
Identifying what is a comment — so it can be scanned for a stray spec-id token — is language-specific, so clew delegates it to a per-language **comment finder** behind a narrow interface, selected for a file by its language.
A new language is supported by registering a finder; the spec-id-in-comment check is unchanged.
clew ships finders for the languages it already scans for anchors; others plug in the same way.

**Rationale**
Comment syntax varies by language (`//`, `/* */`, `#`, `--`, `<!-- -->`, …); baking one language's rules into the check would miss comments in other languages, or misread code (a `//` inside a string) as a comment.
A finder per language keeps the check correct across languages and extensible without touching the check — the same shape clew already uses for language-specific generation (ARCH-003) and anchor scanning, so a project adding a language adds a finder, not a fork.

**Verification Description**
A comment in a supported language is recognized and scanned; a second language's comments are recognized once its finder is registered, with no change to the check; a construct that is not a comment in that language is not scanned.

## Relations

**Realizes**

- [SYS-014 — The system detects a spec reference that bypasses the anchor](SYS-014-detect-references-bypassing-anchor.md)

**Related**

- Mirrors [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](ARCH-003-generator-interface.md) — the same pluggable-per-language shape, for comment detection.
- The report [SW-033 — clew reports a spec id found in a code comment](SW-033-flag-spec-id-in-comment.md) finds comments through the registered finder.
