---
name: clew-context
description: "Build the context around a story being drafted or promoted — the specs it relates to (directly, and via the code's call graph), candidate supersession or obsolescence, conflicts, cross-relations ranked by code distance, and gaps — so specs are authored and integrated with full awareness of what already exists. Use after a draft story is created and before its specs are written, and at promotion when the context has not already been built. Read-only analysis; it does not author specs (see clew-draft) or finalize them (see clew-promote)."
---

# clew-context

Build the context for a story being drafted or promoted, so the work is grounded in what already exists rather than created in a vacuum.
This is read-only analysis — it produces understanding; it does not write or change specs or code.

The core idea: the story's *stated* relations are what its author had in mind, but the *code* around the area often anchors specs that are just as relevant. The strongest signal is the gap between the two — especially a spec the code points at that has been abandoned.

If you already built this context for these drafts earlier in the session, reuse it rather than rebuilding.

## What a lens is

A **lens** is a kind of spec — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), and so on.
A project declares its lenses in `.ariadnerc.json`, each with an `id` and a one-line `description`; the `id` is also the prefix of the ids minted for that kind (lens `SW` → `SW-001`, `SW-002`, …).

## When to use

- During drafting (`clew-draft`): **after the draft story exists but before its specs are written**, so spec creation is grounded in the corpus.
- During promotion (`clew-promote`): **only if this context has not already been built** for these drafts.

## Reading the project

- Read `.ariadnerc.json` for the `layout` (where stories, derived specs, and the domain model live) and the `lenses`.
- Find how the project binds code to specs — its **trace markers** (for example `realizes`, `verifies`, and `concerns` in the code, or the project's equivalent). Infer the convention from existing code; do not assume a language.
- Prefer the tool's index or resolver if it exists (`clew --help`) for "what relates to this id" — that is the intended, faster path. Until it exists, read the spec files and grep the code directly.

## What you must not do

- Read-only: do not write, move, or modify any spec or code.
- Do not decide supersession, obsolescence, or conflict resolution — surface candidates; the user (and the promotion step) decide.
- Do not commit.

## Procedure

### 1. Read the subject

Read the draft story and any specs drafted for it so far.
Identify its area: the feature, the entities, the lenses it touches, and any code it names.

### 2. Linked specs — what the corpus already says

From the story's area, gather the specs already related to it by the corpus's own relations (realizes, concerns, …), following them transitively up to **2 levels** with a cycle guard.
Tag these `linked` — this is what the author wrote down.

### 3. Code anchors

If the story touches existing code, identify the anchor locations — the code the work will touch or extend:

- explicit code references in the story (file paths, symbols);
- symbols named in the acceptance criteria that exist in the codebase;
- the code surrounding the trace markers of the `linked` specs.

If anchors are ambiguous (the story discusses a concept without naming code), ask the user to nominate one or two rather than guessing — a weak anchor produces noisy expansion.
If there is no relevant code yet (greenfield, or a spec-only phase), skip steps 4–5 and note it; the corpus analysis alone still applies.

### 4. Execution-path expansion — what the code has decided

From each anchor, walk the call graph and collect the project's trace markers:

- read the anchor and collect its markers;
- walk **callers 1 level** and **callees up to 2 levels**, collecting markers along the way;
- stop at framework/library boundaries — do not chase into third-party code;
- cap at about **8 files per anchor**, and prefer breadth (more immediate neighbours) over depth.

Each spec found this way that was not already `linked` is tagged `path` — relevant via the code, though the story never named it.

### 5. Cross-relations — ranked by code distance

For specs that share a code location, rank the coupling so attention goes to the highest-impact first:

- **same anchor site** — strongest; changing the traced behaviour likely affects all of them at once;
- **same method** — strong;
- **same class** — moderate;
- **same file or area** — informational.

Flag the locations where the planned work might affect other specs.

### 6. Supersession, conflicts, gaps

- **Supersession / obsolescence** — specs the story would replace, or that are already marked obsolete or superseded. A `path` spec that is obsolete is the strongest possible signal that a design direction was tried and abandoned; surface it prominently, never silently drop it.
- **Conflicts** — existing specs the story's direction would contradict.
- **Gaps** — behaviour the story implies that no spec covers; this tells the drafting step which specs (and which lenses) to create.

### 7. Summarize

Present the context map:

- the acceptance criteria carried from the story;
- `linked` specs vs `path` specs (with where each `path` spec was found);
- obsolete / superseded-on-path called out prominently;
- cross-relations, ranked by code distance;
- the gaps.

This summary is what the drafting step authors against and the promotion step integrates with.

## Done when

- The context map is presented: `linked` vs `path` specs (with where each `path` spec was found), supersession/obsolescence and conflict candidates, cross-relations ranked by code distance, and the gaps.
- Obsolete or superseded specs found on the call path are called out, never silently dropped.
- Nothing is written, moved, or committed — the analysis stays read-only.
