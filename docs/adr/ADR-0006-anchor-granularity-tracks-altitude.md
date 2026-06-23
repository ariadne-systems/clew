# ADR-0006: Anchor granularity tracks spec altitude

- Status: Accepted.
- Date: 2026-06-23
- Deciders: project maintainer.
- Refines: ADR-0001 (compile-checked, id-anchored traceability), ADR-0004 (relation taxonomy), ADR-0005 (scanning and coverage).

## Context

The tool's value is the anchor: a spec earns its place by being anchored in code, because the anchor is the path an agent — and the compiler — follows from intent to implementation.
A spec that nothing anchors is inert: authored once, then drifting, forgotten by the very agent it was meant to guide.

High-altitude specs — stakeholder needs (`STK`) and system capabilities (`SYS`) — looked like they failed this test.
No single line of code "realizes a stakeholder need", which suggested either dropping them or keeping them as un-anchored documentation — both of which contradict the tool's premise.

The missing variable was **granularity**.
A fine-grained behaviour is anchored at a symbol; a high-altitude need or capability is anchored at the **file or module** that serves it.
"Low authoring friction" is not one line, but it is a set of files; the reverse-scan capability is a module.
Anchored there, the high-altitude specs are honest, navigable anchors like any other.

## Decision

### D1 — Granularity tracks altitude

A spec is anchored at the granularity that matches its altitude:

- `SW` / `CON` / `NF` — at the **symbol** (a function, class, or test), via the value, decorator, and test marker forms.
- `STK` / `SYS` — at the **file or module**, via the type-form marker as a standalone file-scope alias (`type _Anchors = Realizes<…> | …;`), which the lexical scan already recovers (ADR-0005 D3) at no runtime cost.

A module-level anchor lives in the module's entry file (`index.ts`).
The agent chooses the tightest honest scope: a spec anchored too high — at a package root — governs everything and floods context, whereas one anchored on the files that genuinely serve it surfaces only where it is relevant.

### D2 — Anchorability is the validity test

If a spec cannot be honestly anchored — no code, no file, no module serves it — it does not belong in the corpus.
Authoring a high-altitude spec is therefore provisional until it is anchored; one that resists anchoring is documentation pretending to be a traceable, and is dropped.

### D3 — Relevance flows on two axes

Because high-altitude specs are anchored by containment rather than behaviour, the context an agent needs reaches its code two ways: **across** the call graph (the behaviours it interacts with) and **up** the file/module tree (the high-altitude specs that govern where it lives).
The context-building skill walks both — the execution-path expansion and the containment ascent (clew-context).

## Consequences

`STK` and `SYS` are first-class generated traceables, anchored at file/module altitude, and covered like any other spec once anchored — with no lens-special-casing in coverage (ADR-0005).
An agent working anywhere gets the high-altitude "why" by ascending its module tree, not only the behavioural "what" from its call graph.

Placement is coarse at first — a package `index.ts` may carry several anchors — and tightening to the specific files that serve each spec is a later refinement, not a re-architecture.
