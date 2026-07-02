**Title**
Discover anchors in Java via a lexical scan

**Lens**: SW

**Description**
The Java generator implements discovery for its own markers: it reads the source and returns every anchor as a spec id, its relation, and its location — the file path and line number where it occurs.
It recognizes each annotation the generator emits (SW-037) — one per relation (`realizes` / `verifies` / `concerns`) per spec set, each named for its relation and set (`@RealizesSoftware`, `@VerifiesSoftware`, `@ConcernsSoftware`, …) — on a package, type, method, or field, whose value is a single enum member or a `{…}` list of members, reading the relation from the annotation's leading verb and the referenced member(s) as the ids.
From each it reads the referenced member name(s) and resolves each to a spec id from the member's leading `<PREFIX>_<NUMBER>` — the generator forms the member name from the spec's id and slug (SW-037) — inverting it to `<PREFIX>-<NUMBER>`, with no lookup into the generated enums.
The scan is lexical: it locates annotation sites by pattern and reads the referenced members, deliberately short of a full Java parse.
It considers only code: the source is classified into regions — code, line and block comments, string and char literals, and text blocks — through the shared C-family lexer in its Java dialect (text blocks, no template or regex literals), and annotations are matched only in code regions.
So an annotation-shaped sequence inside a comment, commented-out code, a string, a char literal, or a text block is not an anchor and is not reported.
Discovery and generation name the same ids by construction — the dual round-trip (ARCH-004) — so the generated enums the scan skips are never read to resolve an id.

**Rationale**
The generator owns the annotation grammar, so it owns reading it back (ARCH-004).
A lexical scan is simple, fast, and dependency-free; a full Java parse or an annotation-processing pass would be heavier and toolchain-locked, and the annotations are regular enough not to need it.
The Java-specific trap a naive match would mis-read is the text block (`"""…"""`), whose contents can look like code; classifying it out is part of the scan, which the shared lexer's Java dialect already does.

**Verification Description**
Over a fixture, every annotation form is discovered with the right relation, id(s), and location (file path and line number).
A single member and a `{…}` list both resolve correctly.
An annotation placed in a comment, in commented-out code, in a string, a char literal, or a text block yields no anchor.
The ids the generator emits for a set of example markers are exactly the ids its discover recovers from them (the round-trip; ARCH-004).

## Relations

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)
- [SYS-011 — Named anchor relations](SYS-011-named-anchor-relations.md)

**Related**

- Parallels [SW-021 — Discover anchors in TypeScript via a lightweight lexical scan](SW-021-discover-anchors-typescript.md) — the same discovery, for Java's annotation forms.
- Implements the discover half of [ARCH-004 — Generation and reading back are dual operations](ARCH-004-generator-discovers-markers.md) for Java.
- Reads comments and code regions through [ARCH-006 — Comment detection is a generator capability](ARCH-006-pluggable-comment-finders.md), the shared C-family lexer in its Java dialect.
