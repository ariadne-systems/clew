---
name: clew-review
description: "Review a change's spec-to-code integrity, on demand. For each spec the change added or gave a new ## Changes entry, follow its realizes anchor to the code and its verifies anchor to the test, and judge whether the code honours the spec's current intent and whether the test still exercises it. Catches the drift the build cannot — a widened spec whose code or test stayed on the old claim while coverage stays green. Runs as the final step of clew-implement, over the specs an increment changed, and on demand at PR time. Read-only and advisory; it is the spec-conformance half of a review and never replaces a code review for correctness, and is not a build gate. Distinct from clew-anchor (places markers) and coverage (checks the link exists)."
---

# clew-review

`clew coverage` proves the spec-to-code link **exists**. This skill checks whether it is **true** — whether the code behind an anchor honors the spec, and whether the test behind it can actually fail. The two are independent: an anchor compiles and reports **Covered** whether or not the code does what the spec says, and whether or not the test could ever fail. Nothing in the build catches the difference, by design — it is semantic, and no compiler or coverage number reaches it.

It is **advisory and read-only**: it proposes findings for you to disposition, never rewrites an anchor or the code, and is never a `clew check` gate. It runs both as the **final step of `clew-implement`** — over the specs that increment added or changed, to catch drift before the increment is presented — and **on demand** at PR time or over a wider change. It stays advisory even as a required implement step: the author dispositions the findings, and nothing gates the build. And `clew-implement` requires this conformance pass but does **not** force the code review for correctness — that stays yours to run.

## Scope

The specs this change touched, and only those:

- specs newly added to the corpus in this change,
- specs given a new `## Changes` entry in this change,
- the story that carries them.

A spec the change did not touch is out of scope, no matter how it reads. Over a whole PR, take the specs it touched — its spec files, and the specs whose anchored code it changed.

## The walk

For each spec in scope:

**1. Follow its `realizes` anchor to the production code.**
Read the spec's Description, Rationale, and Verification Description first, then read the code, and judge whether the code implements *that* intent — not merely that it compiles, and not that some related behaviour works.

Flag **drifted-realize** when the anchor is present and the spec Covered, yet the code's semantics diverge from what the spec says *now*: a spec stated in one unit realized by code that counts another; a widened spec realized by code that still handles only the narrow case.

**2. Follow its `verifies` anchor to the test.**
Judge whether the test exercises the spec's *current* claim with an assertion that could fail.

Flag **stale-verify** when the test compiles and the spec reads Covered, but nothing the test asserts depends on the current intent. This is the ordinary outcome when a spec was widened and its test was not: the old test keeps compiling, keeps passing, and keeps the spec Covered over a claim it no longer checks.

**3. Check that each anchor points where it claims to.**
Flag **misanchor** for a `realizes` / `verifies` / `concerns` marker naming the wrong spec, or sitting on code that does not hold the relation it asserts — a `verifies` test that would still pass if the spec were violated verifies nothing.

## Not a finding

- Production code deliberately left unanchored because its spec arrives in a later increment.
- A spec with no single obvious realization, left unanchored rather than anchored on a guess — that is the correct call, not a gap.
- Code that is *wrong* while faithfully implementing the spec it is anchored to — that is the code review's finding, not this one.

## Confirm before you report

A finding you cannot point at — this anchor, this sentence of the spec, this line of code — is a guess. Trace it, then state it with the evidence. Order findings by severity and report the drift plainly.

## Done when

Every spec in scope has had both its anchors followed and judged, every finding is traced and confirmed or dismissed, and the result is presented for the author to disposition — nothing re-anchored without them, nothing gated.
