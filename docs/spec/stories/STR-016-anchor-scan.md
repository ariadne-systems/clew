**Title**
Add a `clew scan` that finds where code anchors specs — the reverse of generation

**Business Value**
`clew spec` makes the forward link — a spec becomes a symbol the compiler checks at the anchor site — but nothing yet reads the code *back* to see which specs are anchored, and where.
That reverse read is the foundation the tool's real promise stands on: coverage (is every spec implemented and tested?) and traceback (what realizes `SW-001`, and where?).
This story builds that foundation — the scan that turns the anchors in the code into a set of located references — so the later coverage and traceback stories have something to stand on.
Without it the compiler still catches a dangling anchor, but a spec that nothing implements stays invisible.

**Problem / Context**
The forward direction is compile-checked: an anchor names a live spec, and removing the spec breaks the build (ADR-0001 D1).
The compiler is structurally blind to the reverse — a spec that *nothing* anchors — because nothing references it to fail (ADR-0005 D1).
Seeing that gap needs the code scanned for its anchors and compared against the specs; ADR-0001 named the reverse-completeness check (D6) and the index (D4) but left both undesigned.
Today the markers `realizes`, `verifies`, and `concerns` sit in the code, checked one-by-one by `tsc`, but never collected.

**Solution Approach**
Add the scan as the **dual of generation** (ADR-0005 D2): the generator that *emits* a language's markers is the only thing that reliably *finds* them, so the generator contract gains a discover operation beside generate, and the core orchestrates — it drives each configured generator's scan over the source tree and aggregates the results into the **anchor locations** — a collection (the same id may be anchored at many sites), each a spec id, the relation (realizes / verifies / concerns), and the file path and line number it was found at.
The TypeScript generator implements the scan as a **lightweight lexical scan** (ADR-0005 D3): it locates the three marker forms and reads the **leading id argument** — a member or a `[…]` list, bracket-aware, ignoring the wrapped value, and considers only code — never marker-shaped text in comments or string literals.
The scan is language-neutral in the core and language-specific only in the generator, exactly as generation is (ARCH-003).
A minimal set of built-in exclusions — non-source and tool-owned locations (`node_modules`, build output, the generated traceables dir) — keeps the scan usable; the configurable `exclude` / `unexclude` model is the next story.
`clew scan` runs it and reports the anchor locations (and writes the locations index — the shared `locations.json` shape, ADR-0005 D6).
This story is the **scan primitive only**: collecting located anchors; computing coverage, the waiver list, and enforcement are later stories (A3/A4), and resolution/traceback queries later still (B1).

**Affected specs and artifacts** (planned; ids bound on promotion)
- ARCH — the generator contract gains a **discover** capability, the dual of generate; the core depends on the interface, never a concrete generator (sibling to ARCH-003; ADR-0005 D2).
- SW — the **core** drives each generator's scan over the source tree and aggregates anchor locations (id, relation, file:line); language-neutral (sibling to SW-013).
- SW — the **TypeScript generator** discovers the three marker forms via a lexical scan, reading the leading id argument (language-specific; sibling to SW-018; ADR-0005 D3).
- SW — `clew scan` command surface: run the scan, report the located anchors and emit the locations index (thin; sibling to SW-012).
- CON — the scan applies **built-in exclusions** by default (non-source, tool-owned), so it never reports anchors from generated or dependency code; the configurable model is deferred (A2).

**Acceptance Criteria**
- `clew scan` over a fixture source tree returns every anchor in it as (id, relation, file path, line number), for all three relations and all marker forms: the function-wrapper `realizes(ids, value)` / `concerns(ids, value)`, the decorator `@realizes(ids)`, the test wrapper `verifies(ids, run)`, and the type / interface `Realizes<ids, T>`.
- Re-running replaces the locations index wholesale: the scan is full (every source file, regardless of modification time), so a fresh run overwrites any existing index rather than merging into it.
- The leading id argument is read correctly: a single member and a `[…]` list both resolve to the right id(s), and the wrapped value — which may itself contain parentheses or commas — is ignored.
- The core invokes the scan through the generator interface only — it contains no language-specific marker knowledge and references no concrete generator type.
- Anchors inside the built-in excluded locations (`node_modules`, the generated traceables dir, build output) are not reported.
- A marker-shaped sequence inside a comment, commented-out code, a string literal, a **template literal**, or a **regex literal** is not reported — only anchors in live code count (ADR-0005 D3).
- A generator's emitted markers round-trip: for a set of example markers, the scan recovers exactly the emitted ids (the dual conformance check, ADR-0005 D2).
- Vitest covers: each marker form discovered; leading-argument extraction including a value with nested parens; a multi-id list; built-in exclusion; the core driving a fake generator's scan through the interface; and the round-trip conformance.

**Decisions** (resolved by ADR-0005 / ADR-0004)
- The reverse direction is a **scan**, not the compiler (ADR-0005 D1).
- The scan is **generator-owned**, the dual of generation; the core orchestrates and aggregates (ADR-0005 D2).
- The scan is a **lexical scan**, not an AST parse; it reads the leading id argument bracket-aware (ADR-0005 D3).
- All three relations are collected, but their roles differ downstream: realizes / verifies feed coverage, concerns is context only (ADR-0004 D2; ADR-0005 D4). A1 only collects; it does not judge coverage.
- Naming: this is the **code** scan (the *check* side), distinct from the spec→traceables scan inside `spec` (SW-013, the *declare* side); the command is `scan`.

**Out of scope**
- Coverage — comparing anchored specs against all traceables, the waiver list, the report, enforcement (later stories A3/A4; ADR-0005 D4/D5).
- The configurable exclusion model — `exclude` / `unexclude`, root-relative globs, precedence (next story A2; ADR-0005 D6).
- Resolution / traceback queries and the committed, content-hashed index (B1; ADR-0001 D4).
- Content-hash drift (deferred; ADR-0001 D1).
- The `coverage.json` shape and the coverage gate — A1 emits only the locations index.

## Relations

**Realizes**

- [ARCH-004 — Discovery is delegated to language-specific generators behind the generator interface — the dual of generation](../derived-specs/ARCH-004-generator-discovers-markers.md)
- [SW-022 — Scan the code into the set of anchor locations](../derived-specs/SW-022-scan-code-into-anchor-locations.md)
- [SW-021 — Discover anchors in TypeScript via a lightweight lexical scan](../derived-specs/SW-021-discover-anchors-typescript.md)
- [SW-023 — The tool exposes a `scan` command that reports the code's anchor locations](../derived-specs/SW-023-scan-command.md)
- [CON-016 — The scan excludes dependency and build directories by default](../derived-specs/CON-016-scan-builtin-exclusions.md)

**Related (existing corpus)**

- Dual of [SW-013 — Scan the configured artifacts into the set of traceables](../derived-specs/SW-013-scan-traceables.md) and [SW-014 — Generate traceables through the configured generators](../derived-specs/SW-014-generate-traceables.md) — the *declare* side; this story is the *check* side.
- Extends [ARCH-003 — Generation behind a narrow generator interface](../derived-specs/ARCH-003-generator-interface.md): the interface gains the dual `discover` operation.
- TypeScript discovery is the sibling of [SW-018 — TypeScript generator output](../derived-specs/SW-018-typescript-output.md) (the emit side of the same markers).
- Built-in exclusion relates to [CON-012 — Generated files are tool-owned](../derived-specs/CON-012-generated-files-tool-owned.md).
- Picks up the *check* side deferred by [STR-011 — the `spec` command](STR-011-spec-command.md).

## Changes

- **2026-06-29** — Updated the link text for CON-016 to its revised title (STR-024).
Reference-only; this story's meaning is unchanged.
