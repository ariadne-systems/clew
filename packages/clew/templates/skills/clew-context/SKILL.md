---
name: clew-context
description: "Build the context around a story being drafted or promoted — the specs it relates to (directly, via the code's call graph, and via the high-altitude specs that govern its file/module), candidate supersession or obsolescence, conflicts, cross-relations ranked by code distance, and gaps — so specs are authored and integrated with full awareness of what already exists. The same walk grounds a change to existing code: an anchor is a checked claim, not a proof of correctness, so read the spec it points at and work from its intent. Use after a draft story is created and before its specs are written, at promotion when the context has not already been built, and before changing code in an anchored area. Read-only analysis; it does not author specs (see clew-draft) or finalize them (see clew-promote)."
---

# clew-context

Build the context for a story being drafted or promoted — or for a change to existing code in an anchored area — so the work is grounded in what already exists rather than created in a vacuum.
This is read-only analysis — it produces understanding; it does not write or change specs or code.

The core idea: the story's *stated* relations are what its author had in mind, but the *code* around the area often anchors specs that are just as relevant. The strongest signal is the gap between the two — especially a spec the code points at that has been abandoned.

Relevance reaches a piece of code two ways, and this skill walks both: **across** the call graph (the behaviours it interacts with — usually `SW`), and **up** the file/module tree (the high-altitude specs that govern where it lives — usually `STK`/`SYS`, anchored coarsely at the file or module-entrypoint level). The first is the execution-path expansion; the second is the containment ascent.

If you already built this context for these drafts earlier in the session, reuse it — unless the drafts or the code area have changed since, in which case rebuild.

## An anchor is a claim, not a proof

The build checks only that an anchor's spec id **exists** — never that the code is **correct**.
`realizes` and `verifies` are *stated*, not *proven*: an anchor records that someone asserted this code implements or exercises the spec, not that it does. Do not rely on it as evidence the code is right.

So when you change code that realizes a spec, **read that spec first** and make the change from its **intent**, not from the code's current behaviour.
Where the code has drifted from the intent, the anchor was masking that drift — and reasoning from the intent, rather than preserving what the code happens to do, is what surfaces the bug.

## What a lens is

A **lens** is a category of spec — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), and so on.
A project declares its lenses in `.clewrc.json`, each with an `id` and a one-line `description`; the `id` is also the prefix of the ids minted for that kind (lens `SW` → `SW-001`, `SW-002`, …).

## When to use

- During drafting (`clew-draft`): **after the draft story exists but before its specs are written**, so spec creation is grounded in the corpus.
- During promotion (`clew-promote`): **only if this context has not already been built** for these drafts.
- Before **changing code anchored to a spec**: read that spec and work from its intent, treating the anchor as a claim, not a proof (see *An anchor is a claim, not a proof*).

## Reading the project

- Read `.clewrc.json` for the `layout` (where stories and specs live) and the `lenses`.
- Find how the project binds code to specs — its **trace markers** (`realizes`, `verifies`, and `concerns` — the fixed relations, in whatever marker syntax the generator uses). Infer the convention from existing code; do not assume a language.
- For "what anchors / relates to this id", prefer a dedicated command if one exists (`clew --help`) — the intended, faster path. Otherwise filter the reverse index the scan writes — `.clew/locations.json`, mapping a spec id to its anchor sites — and read the spec files; the index can lag very recent edits, so grep the code directly when current precision matters.

## What you must not do

- Read-only: do not write, move, or modify any spec or code.
- Read-only extends to commands: run nothing that writes files, installs, or mutates a cache — prefer a static index; a generator or build that emits output is not a read.
- Do not decide supersession, obsolescence, or conflict resolution — surface candidates; the user (and the promotion step) decide.
- Do not commit.

## Procedure

### 1. Read the subject

For a draft or promotion, read the draft story and any specs drafted for it so far.
For a change to existing code with no story, the subject is the change intent and the code it touches — there are no acceptance criteria or draft specs to read; carry the change intent in their place.
Identify the area either way: the feature, the entities, the lenses it touches, and the code named or affected.

### 2. Linked specs — what the corpus already says

From the story's area, gather the specs already related to it by the corpus's own relations (realizes, concerns, …), following them transitively up to **2 levels** with a cycle guard.
Tag these `linked` — this is what the author wrote down.

### 3. Code anchors

If the story touches existing code, identify the anchor locations — the code the work will touch or extend:

- explicit code references in the story (file paths, symbols);
- symbols named in the acceptance criteria that exist in the codebase;
- the code surrounding the trace markers of the `linked` specs.

If anchors are ambiguous (the story discusses a concept without naming code), ask the user to nominate one or two rather than guessing — a weak anchor produces noisy expansion.
If there is no relevant code yet (greenfield, or a spec-only phase), skip steps 4–6 and note it; the corpus analysis alone still applies.

### 4. Execution-path expansion — what the surrounding execution exposes

From each anchor, walk the call graph and collect the project's trace markers:

- read the anchor and collect its markers;
- walk **callers 1 level** and **callees up to 2 levels**, collecting markers along the way;
- stop at framework/library boundaries — do not chase into third-party code;
- cap at about **8 files per anchor** and **~24 files overall** across all anchors, and prefer breadth (more immediate neighbours) over depth.

Each spec found this way that was not already `linked` is tagged `path` — relevant via the code, though the story never named it. A `linked` spec also found on the path is not reclassified; note the overlap, as two independent channels are stronger evidence than one.

### 5. Lateral scan — the other anchors of each local spec

Steps 2–4 gather the specs near the change; this goes the other way — from each **fine-grained** spec found so far (a behaviour anchored at a precise site, typically `SW`/`CON`), find its **other** anchors across the codebase and read them. That is where code sharing the same unit of intent — a sibling implementation, a distant test, a configuration point — lives without ever touching the call path.

- For each such spec, look up everything that anchors it — filter `.clew/locations.json` for the id, or grep its traceable across the code when the index may be stale (see *Reading the project*) — and read each new site, collecting its markers. Specs found this way are also tagged `path`.
- Gate the scan on the spec's **measured** reverse fan-out, not on its lens: before reading, count how many sites anchor it, and skip only when that count is **broad** (a handful is fine — skip past roughly six), because a broad reverse scan is low-signal noise whichever lens the spec is. This usually coincides with a high-altitude **governing** spec (`STK`/`SYS`) anchored coarsely over a whole region — but where a project anchors its `STK`/`SYS` narrowly, at a few precise sites, their other anchors are squarely in the change set and must be read. A spec skipped as broad still stays the "why" of the containment ascent (step 6), not coupling to chase.
- One hop only — do not re-run the call-graph walk from each lateral hit. Keep it within the same overall budget as step 4, prefer the nearest sites, and say so if a spec has more anchors than you read.
- Exception when the change **reshapes a type or other shared shape**: the `verifies` (test) anchors of every related spec are the change set, not a sample — read them all rather than capping to the nearest, since each test encodes an assumption the reshape may break. The budget bounds exploratory breadth, not the sites a shape change is certain to touch.

### 6. Containment ascent — what governs where the code lives

The call graph finds the specs a piece of code *interacts with*; it does not find the high-altitude specs that *govern the region it lives in*. Those — typically `STK` and `SYS` — are anchored coarsely, at the **file or module** level, so they are reached by climbing the containment tree, not by following calls.

From each anchor, ascend its containment hierarchy — as the target language and workspace declare it — and collect the anchors at each level:

- the anchor's **own file** — its file-scope anchors (in TypeScript, for example, a `type _Anchors = Realizes<…>` alias; other languages use their own file-scope form);
- each ancestor **module entrypoint** — the file where a module-level anchor lives (for example `index.ts`, `__init__.py`, `mod.rs`, or a package declaration) — up to the package boundary;
- stop at the package boundary declared by the workspace or manifest; do not climb out of the package.

Each spec found this way is tagged `governing` — the high-altitude intent (a stakeholder need or system capability) claimed to govern the code, though neither the story nor the call graph named it. Surface these as the "why": an agent changing a file that ascends to `STK-003` (low authoring friction) is told the constraint its change must respect.

### 7. Cross-relations — ranked by code distance

For specs that share a code location, rank the coupling so attention goes to the highest-impact first:

- **same anchor site** — strongest; changing the traced behaviour likely affects all of them at once;
- **same callable** (function or method) — strong;
- **same enclosing scope** (class, module, or namespace) — moderate;
- **same file**, then **same package/module** — informational.

Flag the locations where the planned work might affect other specs.

### 8. Supersession, conflicts, gaps

- **Supersession / obsolescence** — specs the story would replace, or that are already marked obsolete or superseded. A `path` spec that is obsolete is a high-priority signal that a design direction was tried and abandoned; surface it prominently, never silently drop it.
- **Conflicts** — existing specs the story's direction would contradict. Call it a conflict only when both cannot hold at once; where they can coexist uneasily, surface it as a *tension*, not a conflict.
- **Gaps** — behaviour the story implies that no active spec covers; this tells the drafting step which specs (and which lenses) to create. A gap is only as reliable as the area searched — if coverage was partial, say so rather than asserting absence.

### 9. Summarize

Present the context map:

- the acceptance criteria carried from the story, or — for a code change with no story — the change intent;
- `linked` specs vs `path` specs (with where each `path` spec was found);
- `governing` specs from the containment ascent — the high-altitude `STK`/`SYS` intent over the area;
- obsolete / superseded-on-path called out prominently;
- cross-relations, ranked by code distance;
- the gaps.

This summary is what the drafting step authors against and the promotion step integrates with.

## Done when

- The context map is presented: `linked` vs `path` specs (with where each `path` spec was found), `governing` specs from the containment ascent, supersession/obsolescence and conflict candidates, cross-relations ranked by code distance, and the gaps.
- Obsolete or superseded specs found on the call path are called out, never silently dropped.
- Nothing is written, moved, or committed — the analysis stays read-only.
