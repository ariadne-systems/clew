# ADR-0005: Scanning code for anchors, and coverage as the reverse check

- Status: Accepted.
- Date: 2026-06-21
- Deciders: project maintainer.
- Refines: ADR-0001 (compile-checked, id-anchored traceability), ADR-0004 (relation taxonomy).

## Context

The anchoring built so far is one-directional and compile-checked: code references a spec id through a generated marker, and a reference to a removed id fails to build (ADR-0001 D1).
The type-checker enforces the forward link — an anchor names a live spec — but it is blind to the reverse: a spec that *nothing* anchors.
That blind spot, a requirement declared but never implemented or tested, is the drift-and-reinvention failure mode the whole approach exists to catch; ADR-0001 named a reverse-completeness check (D6) and an index/resolution layer (D4) but left both undesigned.

Establishing the reverse therefore needs the code read *back* — scanned for its anchors — and compared against the full set of traceables.
This scan-based shape is proven prior art — a scanner produces a code-locations index and a coverage result that downstream traceback and verification consume — so the shape is proven prior art.
This decision brings the same capability to the open tool, aligned with that prior art rather than forked from it, and settles the shape of the scanning subsystem before its stories are authored.

## Decision

### D1 — Coverage is the reverse of the anchor, and only a scan can see it

Coverage here means **traceability coverage** — the share of specs that some code anchors — not test, line, or structural coverage; the bare word "coverage" is shorthand *within this document* only.
On any surface an assessor or user reads — the CLI, reports, audit output — the full term **traceability coverage** is used, because to an ASPICE or ISO 26262 reader "coverage" means requirements or structural coverage (MC/DC), not this.
It is established by scanning the code for its anchors and comparing the result against the full set of traceables; the gap — a spec that nothing anchors — is what the compiler cannot report.
The forward property (an anchor names a live spec) stays compile-checked; the reverse property (a spec is anchored at all) is a scan.

Rationale.
Existence and coverage are different properties, as existence and content-currency are in ADR-0001 D1: the type-checker sees the forward one, a scan sees the reverse one.
Nothing references an unanchored spec, so nothing can fail to compile for it — the compiler is structurally unable to report the gap.

Rejected alternative.
Rely on the compiler alone: it can never surface an unimplemented requirement, because the absence of an anchor is the absence of a reference.

### D2 — The scan belongs to the generator, not the core

A generator both **emits** and **discovers** its own markers — generation and scanning are dual operations of one contract.
Finding anchors is language-specific — a TypeScript anchor is `realizes(…)` / `@realizes` / `Realizes<…>`, another target's is its own form — so the generator that writes a language's markers is the only component that reliably reads them back, and the scan is the dual of generation on the same contract.
The language-neutral core orchestrates: it drives each configured generator's scan and aggregates the results into one index, depending only on the generator interface, exactly as it drives generation today (ADR-0001 D9, ARCH-003).

Rationale.
The marker grammar is the generator's knowledge; placing the scan anywhere else duplicates it and leaks a language assumption back into the core, the boundary D9 forbids.
A generator that both writes and reads its own markers keeps the contract coherent and the cost of a new language at one implementation.

Rejected alternative.
A core scanner that knows every language's marker syntax — it re-introduces the language coupling D9 exists to prevent.

Note (conformance).
Because emit and discover are duals, they are testable as duals: for a set of marker examples, the ids a generator emits must be exactly the ids its own scan recovers.
That round-trip is the trust model for the *generator's* side — that its discover recovers exactly what its generate emits — and the safety net as languages are added.
It does not, by itself, validate a hand-written anchor; that rests on the compiler and the comment-and-string exclusion (D3).

Note (first generator).
The first implementation has a single generator (TypeScript), so the first scan is TypeScript-only in practice; the contract is fixed now so a second language adds a scanner, not a core change.

### D3 — The scan is a lightweight lexical scan, not a full parse

The scan locates marker sites by pattern and extracts the referenced enum member(s) — the id(s) — without building an AST.
The decorator form (`@realizes(ids)`) and the type form (`Realizes<ids, …>`) isolate the ids directly; the function-wrapper form `realizes(ids, value)` carries the wrapped value in the same parentheses, so the scan reads only the **leading argument** — a single member or a `[…]` list, up to the top-level comma — and ignores the value.
Locating a site is a regular-expression match; bounding that leading argument across a list or a multi-line call is a small bracket-depth read, not a regular-language problem — so the scan is lexical, a tokenizer-level read kept deliberately short of a parser.

An anchor counts only where it is **code**: the scan ignores matches inside comments, commented-out code, and string literals — including, per language, every string-like form a marker could hide in (in TypeScript, template and regex literals as well as quoted strings, which a naive pattern match would mis-read).
A marker-shaped sequence in a comment or a string is not an anchor — treating it as one would invent coverage for a spec nothing implements, the exact drift the tool exists to catch.
This is the scan-side counterpart of ADR-0004 D4 (a comment is never the trace), and it is what a lexical scan buys over a blind regex: stripping comments and strings before matching is a tokenizer-level step, not a parse.

Rationale.
A lexical scan is simple, fast, dependency-free, and portable across languages, and is a proven approach at scale across languages as varied as Java, C, TypeScript, and Gherkin.
The id is always a generated enum member (or an id-shaped literal), which is regular; the only complication is clew's value-wrapping form — an id-only annotation form would bound the match with a plain paren-group regex, whereas a wrapped value can itself contain parentheses, so clew reads the leading argument bracket-aware instead.

Rejected alternative.
An AST or type-checker pass (for example the TypeScript compiler API): more robust against unusual formatting, but heavier, slower, and language-locked, and the markers are regular enough that the robustness is not needed.
Revisit only if a marker form arises that the lexical scan cannot bound.

Note (what the scan trusts).
The only legal anchor is a reference to a generated enum member, and the type-checker enforces it: a misspelled or stale id is not a string the scan must judge — it fails to compile (ADR-0001 D1).
The scan's correctness therefore rests on two guarantees it can lean on — the compiler ensures the id is real, and the comment-and-string exclusion ensures the anchor is live code — not on the round-trip (D2), which only proves the generator's emit and discover agree.

### D4 — Coverage counts realizes and verifies; concerns is context, not coverage

A spec is covered when code **realizes** it and/or a test **verifies** it; the **concerns** relation does not count toward coverage.
A spec that is only concerned by code is uncovered and reported as a gap.
The scan still collects `concerns` anchors — they feed context and impact (the resolution direction), not the coverage number.
Which relations are *eligible* to count is the easy half, and it is settled here.
The hard half — the pass condition per spec and per lens (what counts a `SW` as covered: realize, verify, or both) — is the actual audit semantics, and this ADR does **not** settle it: it is a first-class decision the coverage story must own, not something to inherit as already-closed.

Rationale.
Coverage must mean "implemented and tested", the property an audit cares about; letting a mere coupling satisfy it would let coverage be gamed by *mentioning* a spec.
`concerns` exists to build context (ADR-0004), and a comparable traceability system runs its traceback and verification on two relations alone, so two relations suffice for coverage and the third stays out of it.
ADR-0004 D2 is amended to record that `concerns` does not count toward coverage.

Rejected alternative.
Count any anchor as coverage — it inflates the metric and rewards annotation over implementation.

### D5 — Coverage is enforced by default, waived only by a committed reason

Every traceable spec is expected to be covered; an uncovered spec fails the coverage check.
The single exception is an explicit **waiver list**, committed to the project, in which each entry pairs a spec id with a **reason**.
The check fails on any spec that is uncovered and not waived, so a waiver is a visible, reviewed change in version control, never a silent skip.

Rationale.
Inverting the burden — covered unless justified otherwise — avoids enumerating per-lens "what must be traced" rules up front, and turns the gap list into an asset: a committed, reviewed, auditable inventory of "these requirements are not directly traced, and why", which is the artifact a regulated audit asks for.
Because the waiver lives in version control, adding one is a diff a reviewer sees — the enforcement has teeth, the build-check ADR-0001 D6 envisioned.

Rejected alternative.
A soft report with no gate — coverage drifts the moment it is not enforced.
Per-lens "required relations" rules — more rigid and less auditable than default-plus-waivers.

Note.
A waiver should distinguish a permanent, structural gap from a deferred one — a reason category — so temporary gaps can be challenged rather than forgotten; a detail for the coverage story.

Note (the waiver list holds genuine gaps because every spec is anchorable).
The list's value rests on it holding *genuine* gaps.
Every spec in the universe is one that code *can* anchor — at the granularity that matches its altitude (ADR-0006): a behaviour at its symbol, a high-level need or capability at the file or module that serves it.
So an uncovered spec is a real gap, not an artefact of altitude, and the list does not fill with mechanical waivers — a spec with no honest anchor is dropped, not waived (ADR-0006).

### D6 — The configuration and outputs are a stable shared contract

clew and a other tooling operate on the same repository and the same `.ariadnerc.json`.
The companion reads its own sections; clew reads its `idGeneration` / `generators` / `lenses` / `layout` sections; both read the shared `exclude` / `unexclude` with identical semantics.
The scan's outputs — a code-locations index and a coverage result — use shared `locations.json` / `coverage.json` shapes.
Other tooling converges onto clew's vocabulary — `realizes` / `verifies`, lenses, the marker grammar — rather than the reverse.

Rationale.
The config file and the JSON artifacts are the seam at which the open tool and a consumer interoperate; aligning them lets a project configured for one work with the other, and lets the two be swapped on input and output with no translation layer.
Converging the names now, before a consumer exists, is cheap and removes a permanent dialect split over one repository.

Note (ongoing cost, and the durable form).
Aligning the shapes once is cheap; keeping two codebases aligned as both evolve is a recurring tax, paid alone, and a silent schema change on the other side could break the open tool's contract.
The durable form is a single shared schema **definition** owned by one side — the open tool publishes it, the companion depends on it — rather than two copies kept in lockstep by discipline.
That single-owner schema is the intended end-state; this decision commits to the alignment and names schema ownership as the way to hold it.

Rejected alternative.
clew defines its own config keys and output shapes — it forks the ecosystem into two incompatible dialects over the same code.

## Scope and boundary

Two consumers stand on the scan: **coverage** (the priority here) and **resolution / traceback** (the reverse "what anchors X" queries and the agent-context fast path, a later concern).
Both read the same locations index.

The coverage universe is exactly the **lens-bearing traceables the `spec` command produces** — every spec it generates a symbol for, with no per-lens distinction.
`ENT` and `STR` are not traceables and are out of scope.
`STK` and `SYS` **are** in the universe: they are anchored in code at the granularity that matches their altitude — the file or module that serves them (ADR-0006) — and covered like any other spec.
What clew does **not** build is the spec→spec relation graph a transitive roll-up would need; coverage stays the flat code↔spec check, and a high-level spec is covered by its own file/module anchor, never transitively through the specs beneath it.

Left to the stories, not this ADR: the exclusion glob mechanics (root-relative globs, the `exclude` / `unexclude` precedence), the CLI command surfaces, and the `locations.json` / `coverage.json` schemas.

Also left to the coverage story: how the report treats **anchor multiplicity** — a spec anchored once and a spec anchored many times are both covered, but the report may distinguish singly- from multiply-anchored specs, since a redundant anchor can be a signal worth surfacing.
That is reporting policy, not an architecture decision.

Deferred entirely: **content-drift** — comparing a spec's content hash against what the code was anchored to (ADR-0001 D1) — which rides on the committed index and is not part of this work.

## Consequences

The generator contract gains a **scan** capability dual to generation — and with it a conformance obligation: a generator's scan must recover the markers it emits (D2).
The core gains an orchestration that aggregates each generator's scan into one index, depending only on the interface (ARCH-003).

clew gains a **scan** and a **coverage** surface — and, later, resolution — and a new committed artifact, the **waiver list**.

ADR-0004 D2 is amended to record that `concerns` does not count toward coverage.

The scan is policy-light: it makes no judgment about relevance or depth — that stays agentic, in the skills — and instead enumerates completely and deterministically, which is exactly what coverage and resolution need.

A other tooling converges onto clew's vocabulary and shares its configuration and output shapes, so the open tool and that pipeline interoperate over a single repository.

## Changes

- **2026-06-22** — Narrowed the coverage universe to the directly-anchorable lenses (`SW` / `CON` / `ARCH` / `NF`) and dropped the transitive-coverage mandate (D4, the D5 note, and Scope).
`STK` and `SYS` are kept as a documented chain rather than coverage targets: computing coverage over the spec→spec graph would require every relation maintained perfectly and reads as ceremony to the tool's audience, which comes mostly from no specs at all.
clew's automation stays at the code↔spec level it is built for.
- **2026-06-23** — Reversed the STK/SYS exclusion from the previous entry.
STK and SYS are not documentation-only: they are anchored in code at file/module altitude (ADR-0006) and covered like any other spec, so the universe is every traceable the `spec` command produces, with no directly-anchorable-lens restriction (Scope, the D5 note).
The flat code↔spec check and the no-transitive-coverage decision stand; only the earlier claim that nothing anchors STK/SYS was wrong.
- **2026-06-26** — Settled how the coverage universe is *obtained* and *scoped*.
The universe is the **generated traceables** (the enum members), read back through the generator — a read-back operation dual to generation alongside discover (D2 extended; ARCH-004) — rather than a fresh scan of the spec files, so an ALM-sourced status is resolved once at generation, not re-queried per coverage run.
A spec's implementation status **filters generation**: only `active` and `deprecated` specs become traceables; a `planned` spec is not generated and is outside the universe; a `deprecated` spec's traceable is emitted but marked deprecated (kept resolvable so anchors still build) and is listed in the report without counting toward coverage.
This supersedes the `coverage.scope` config option (dropped): scoping to active specs is structural.
The flat code↔spec check, the eligible relations (D4), and default-plus-waivers (D5) are unchanged.
