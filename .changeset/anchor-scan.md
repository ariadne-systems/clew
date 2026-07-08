---
"@ariadne-thread/clew": minor
"@ariadne-thread/trace": minor
---

Add the code-anchor scan and the `clew scan` command (STR-016) — the check-side dual of generation (ADR-0005).

The generator interface gains a `discover` operation beside `generate`: the generator that emits a language's markers now also finds them in source.
The TypeScript generator implements it as a region-aware lexical scan that ignores comments, strings, template literals, and regex literals, reads only the leading id argument bracket-aware, and derives the spec id from the member name with no lookup into the generated definitions.
The core drives each configured generator's discover through the interface, applies built-in exclusions (dependency, build, and generator-output directories), and aggregates the anchor locations, sorted and deterministic.
`clew scan` reports the anchors and writes the locations index atomically, in the shared `locations.json` shape.

This adds the required `Generator.discover` and `Generator.sourceExtensions` members, which every generator must implement — a breaking change to the generator contract, taken before release.
