**Title**
Discover anchors in TypeScript via a lightweight lexical scan

**Lens**: SW

**Status**: active

**Description**
The TypeScript generator implements discovery for its own markers: it reads the source and returns every anchor as a spec id, its relation, and its location — the file path and line number where it occurs.
It recognizes the marker in each of the forms the generator emits (SW-018): the function-wrapper `realizes(ids, value)` / `concerns(ids, value)`, the decorator `@realizes(ids)` / `@concerns(ids)`, the test wrapper `verifies(ids, run)`, and the type markers `Realizes<ids, T>` / `Concerns<ids, T>`.
From each it reads the **leading id argument** — a single enum member or a `[…]` list — bracket-aware, up to the top-level comma, and ignores the wrapped value, which may itself contain parentheses or commas (ADR-0005 D3).
The scan is lexical: it locates marker sites by pattern and reads the leading argument with a small bracket-depth read, deliberately short of a full parse.
It considers only code: the source is classified into regions — code, line and block comments, quoted strings, template literals, and regex literals — and markers are matched only in code regions.
So a marker-shaped sequence inside a comment, commented-out code, a quoted string, a template literal, or a regex literal is not an anchor and is not reported (ADR-0005 D3; ADR-0004 D4).
Template literals and regex literals are the TypeScript-specific traps a naive pattern match would mis-read, so classifying them is part of the scan, not an afterthought.
A reference is resolved to its spec id from the **member name itself**: the member encodes the id as its leading `<PREFIX>_<NUMBER>` (the generator forms the member name from the spec's id and slug; SW-018), and discovery inverts that to `<PREFIX>-<NUMBER>`, with no lookup into the generated definitions.
Discovery and generation name the same ids by construction — the dual round-trip (ADR-0005 D2) — so the generated directory the scan skips is never read to resolve an id.

**Rationale**
The generator owns the marker grammar, so it owns reading it back (ARCH-004).
A lexical scan is simple, fast, and dependency-free; an AST or type-checker pass would be heavier and language-locked, and the markers are regular enough not to need it.
The one complication is the value-wrapping form, whose value can contain parentheses — handled by reading the leading argument bracket-aware rather than to the first parenthesis.

**Verification Description**
Over a fixture, every marker form is discovered with the right relation, id(s), and location (file path and line number).
A single member and a `[…]` list both resolve correctly; a wrapped value containing nested parentheses or commas is ignored, not mis-parsed.
A marker placed in a comment, in commented-out code, in a quoted string, in a **template literal**, or in a **regex literal** yields no anchor.
The ids the generator emits for a set of example markers are exactly the ids its discover recovers from them (the round-trip; ADR-0005 D2).

## Relations

**Realizes**

- [SYS-002 — Reverse-traceability scan](SYS-002-reverse-traceability-coverage.md)
- [SYS-011 — Named anchor relations](SYS-011-named-anchor-relations.md)
