---
name: clew-implement
description: "Take a promoted spec to Covered: set it active and regenerate, read its intent, implement and test it — following the project's own installed implementation and testing skills — anchor the code and test, then verify coverage. Use when a spec is ready to build — e.g. 'implement SW-001', 'build this spec'. Owns the clew frame (active, regenerate, anchor via clew-anchor, verify coverage) and delegates the actual coding to your installed skills. Not spec authoring (clew-draft) or promotion (clew-promote)."
---

# clew-implement

This skill closes one increment: it takes a **promoted** spec from `active` to **Covered** — implemented, tested, and anchored so the build holds the spec-to-code link.

It owns only the **clew-specific frame** around that work — setting the spec `active`, regenerating the traceables, anchoring, and checking coverage. It does **not** tell you how to write the code: the implementation and its tests follow the project's own way of working. It never authors or promotes specs (that is `clew-draft` and `clew-promote`).

## When to use

- A spec is promoted (has a bound id) and you want to build it — "implement SW-001", "build this spec".
- To close an increment after drafting and promoting: turn the decision into working, anchored, covered code.

## What you must not do

- **Do not re-specify how to write code or tests.** The actual implementation and testing follow the project's **installed implementation, testing, and language skills** and its conventions (`003`, `005`); this skill adds only the clew frame around them.
- Do not anchor by hand — delegate to `clew-anchor`. Do not hand-edit the generated traceables folder.
- Do not author or promote specs here, and do not implement a spec that is not yet promoted (no bound id) or is `deprecated`.
- Do not read **Covered** as **correct** (see step 5), and do not skip the review.
- Do not commit.

## Procedure

### 1. Make the spec anchorable — set it active and regenerate

A marker can only reference a spec that generates a traceable, and only an `active` (or `deprecated`) spec does — a `planned` one generates none.

- If the spec is still `planned`, set its `**Status**` to `active`. It is already in the corpus, so record a `## Changes` entry (`006`) — for example "Set active: implementation of STR-… began".
- Regenerate the traceables with the project's spec command (`clew spec`), so the symbol exists to anchor against.
- If the spec has no bound id, or is `deprecated`, stop and report: this skill implements a promoted, live spec — promote or choose a live one first.

### 2. Read the spec's intent first

Read the spec and work from its **intent**, not from whatever the code currently does — the anchor is a claim, not a proof of correctness, so where the code has drifted, reasoning from the intent is what surfaces the bug.

For anything beyond a trivial change, run `clew-context` for the area: it walks the call graph and the containment tree to surface the specs the change touches, so you implement knowing the intent the code around it must honour.

### 3. Implement and test — following the project's own skills

**This skill does not teach coding.** Write the implementation and its test the way the project works: **follow whatever implementation, testing, debugging, and language skills are installed** (for example a TDD skill, a testing-conventions skill, a systematic-debugging skill, a framework skill), and the project's governance (`003` code conventions, `005` testing contract).

Within that, implement the behaviour the spec describes and a test that exercises it, from the intent read in step 2. If no such skill is installed, implement to the project's conventions and the spec's verification description.

### 4. Anchor the code and the test

Bind the implementation and the test to the spec with the generated trace markers by running **`clew-anchor`**: a `realizes` marker on the code, a `verifies` marker on the test. It resolves the marker form from the generator and the folder from configuration — do not place markers by hand or carry a form over from another language.

### 5. Verify it closed — the specs you targeted

Run `clew coverage` and `clew check`. Focus on the spec (or specs) this increment set out to build: each must now report **Covered** — realized *and* verified.

- If a targeted spec is not Covered, go back and find what is missing — a `realizes` or `verifies` anchor not yet placed, a test not written, a stale regeneration — and close it within this increment.
- If you cannot find what is missing — the anchors look right yet coverage still reports the gap — stop and report the problem to the user; do not invent an anchor to move the number.
- A spec that coverage reports as uncovered but that this increment did **not** target is out of scope. Do not anchor it to force it Covered — tell the user it is open and leave it for its own increment.

**Covered proves the link, not the code.** The build confirms the code names a live spec and a test names it; it does not confirm the code is right or that the test asserts anything meaningful. So do not read Covered as done — the implementation and the test still need genuine review.

### 6. Stop for review

Present the change — the code, the test, and the coverage result — for review, with Covered understood as the link's proof, not the code's correctness. Do not commit.

## Done when

- The spec is `active` with its traceable regenerated; the implementation and a test are written following the project's installed skills and conventions; both are anchored (`realizes` / `verifies`) via `clew-anchor`, so the build holds the link.
- `clew coverage` shows every spec this increment targeted as **Covered**, and `clew check` is clean; any *other* open coverage was reported to the user, not forced.
- The change is presented for review — Covered read as the link's proof, not the code's correctness — and nothing is committed.
