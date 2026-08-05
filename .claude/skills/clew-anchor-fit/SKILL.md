---
name: clew-anchor-fit
description: "Critique anchors for appropriateness — whether a placed realizes/verifies/concerns marker names the *right* spec, in the *right* relation, at the *right* granularity, not merely one that exists. The compiler guarantees the target exists and coverage that the link is present; neither catches a plausible mis-target (confirm(Hold) anchored to PLACE_HOLD compiles and stays green). Positively confirm every anchor in the run — no lens or altitude filter: each is confirmed (you can show the fit), a mis-target (you can show the divergence), or unconfirmed (you read both ends and can show neither — itself a finding). Report every mis-target and unconfirmed anchor, ordered by severity, never capped. Read-only and advisory: proposes findings for the author to disposition, never rewrites the anchor or code, never gates the build. Use over an increment's anchors before it is presented, or over a change's anchors at review time. Distinct from clew-anchor (which places markers), coverage (which checks the link exists), and code review (which checks the code is correct)."
---

# clew-anchor-fit

Critique an anchor for **appropriateness**: whether a placed marker names the *right* spec, in the *right* relation, at the *right* granularity — the spec whose intent the code actually answers to — not merely one that exists.

The compiler already guarantees the named spec **exists** (a deleted id will not compile), and coverage reports the link is **present**. Neither can tell whether the link points at the *right* intent. An anchor to a plausible-but-wrong spec — `confirm(Hold)` anchored to `PLACE_HOLD` — compiles, stays green, and misleads every reader who trusts the pointer. This skill asks the orthogonal question: not *does the anchor resolve* but *does it point where it should*.

It is judgment, not a deterministic check — so it is **advisory**: it never rewrites an anchor or the code, never gates the build, and is never a `clew check` member. It is the anchor-side sibling of `clew-critique` — that asks whether a **spec** says enough; this asks whether an **anchor** names the right spec.

## The standard: an anchor must be positively confirmable

An anchor's job is to be a pointer a reader can **follow to the right intent**. So the test is not "can I prove it wrong" but "can I **confirm** it points where it should." Every anchor the critic reviews lands in one of three states:

- **Confirmed** — you can *show* the code answers to the spec's intent. The pass.
- **Mis-target** — you can *show* it does not: a divergence, or a better-fitting spec. A finding.
- **Unconfirmed** — you have read both ends and can show *neither* the fit *nor* a divergence. **Also a finding.**

Confirmation is **positive**: an anchor passes only when you can show the fit, never by default. A freshly-placed anchor a full-context reviewer cannot confirm has already failed its job as a pointer, and the next reader inherits the same wall — so that failure-to-confirm is the finding, whether or not you can name exactly what blocks it. The one thing that is *not* a finding is an anchor you did not actually review; the discipline is on the input — **read both ends of every anchor first.**

## When to use

- **At increment close** — in `clew-implement`'s review step, over every anchor the increment placed, before it is presented. The anchor is fresh and the placing agent had full context, so an unconfirmed one here is a real defect. The author's own adversarial pass.
- **At review / PR time** — over the anchors in a change the reviewer did **not** place. The independent pass, and the reason the skill exists: a fresh reader is what existence-checking can never be.
- **On demand** — critique a named file's or a spec's anchors.

## When not to use

- **Not at draft or promote** — no code, no anchors yet; the spec-side question there is `clew-critique`'s.
- **Not as a code review** — it judges whether the anchor names the right *spec*, reading code against the spec's intent; it does not judge whether the code is *correct*. Bugs are the tests' and code review's job.
- **Not as a gate** — advisory; findings are dispositioned by a human, never a build failure.

## What you must not do

- **Do not re-check existence.** The compiler already guarantees the named spec exists; asserting it adds nothing. The question is *rightness*, not resolvability.
- **Do not rewrite the anchor or the code.** Propose the finding — and, where one exists, the better-fitting spec or relation — for the author to disposition.
- **Do not wave an anchor through unconfirmed.** An anchor passes only when you can *show* the fit; if you can show neither the fit nor a divergence, report it **unconfirmed** — do not default it to appropriate. The next reader will hit the same wall.
- **Do not report an anchor you did not review.** "Unconfirmed" is the honest result of reading both ends and still not being able to confirm — never a shortcut for skipping the read. Read the spec and the code first.
- **Do not cap or suppress findings.** If a pass finds many, that count is itself the finding — the anchoring went systematically wrong. Order by severity; never hide.
- **Do not treat a deliberately coarse anchor as a mis-target.** An anchor placed at a module or boundary for a capability is not wrong for being broad — altitude is not error.
- **Do not slide into correctness review.** "The code has a bug" is out of scope; "the code implements a *different decision* than the one it is anchored to" is exactly in scope.

## Mis-target shapes

The three ways an anchor is shown *wrong*, attached to the code↔spec relationship, not to any lens.

- **Wrong target** — the code implements a *different decision* than the one named. The primary, most-invisible case: `confirm(Hold)` anchored to `PLACE_HOLD`.
  Check: read the spec's decision, then the code's — the *same decision*, or merely the same topic? Is there a spec that fits better, or one that should exist?
- **Wrong relation** — the code is *coupled to* the spec but does not implement or exercise it.
  Check: a `realizes`/`verifies` that is really a coupling (should be `concerns`); a `verifies` test that would still pass if the spec were violated (it verifies nothing).
- **Wrong granularity** — one marker swallowing several distinct decisions, or an arbitrary partial anchor leaving the decision half-covered.
  Check: does the anchored element carry exactly one decision, or many? Is a decision's coverage whole or lossy? (A *deliberately* coarse capability anchor at its entry point is not this.)

An **unconfirmed** anchor is none of these — you could show no shape. It often signals the *spec* is under-specified (nothing can be cleanly anchored to an ambiguous intent), which is `clew-critique`'s domain; route it there.

## Procedure

Review **every** anchor in the run. The run's unit is the increment by default (bounded work, freshest risk); a full-corpus sweep is a deliberate, occasional operation.

1. **Gather the anchors** — and take *all* of them, no altitude or ambiguity filter:
   - an **increment** — the anchors it placed: the specs it targeted via `clew anchors <ids>` (JSON keyed by id → sites), or the markers in the changed files;
   - a **file or PR** — the markers in those sources;
   - a **spec** — `clew anchors <id> [--relation]` for every site that names it.
2. **Read both ends.** For each anchor, read the **spec** it names — Description, Rationale, Verification, enough to know the decision it pins — and the **code element** the marker sits on. Where the anchor is high-altitude (a marker on a module or entry point), run `clew-context` to see what that code actually governs.
3. **Confirm, refute, or neither.** Trying first to *confirm* the fit and then to *refute* it, place the anchor: **confirmed** if you can show the code answers to the spec's intent; **mis-target** if you can show a shape above; **unconfirmed** if you read both ends and can show neither.
4. **Say what you can.** For a mis-target, name the divergence and, where one exists, the better fit. For an unconfirmed anchor, say what you *could* determine about the ambiguity (the spec is silent on X; two specs equally fit; the code's role is opaque) to aid disposition — but the finding stands on the failure-to-confirm, not on articulating it fully.
5. **Order by severity and present** — do not re-anchor. Report the confirmed *count*; report every mis-target and unconfirmed anchor.

## Signal-to-noise — the one discipline

The critic is a tireless agent and the reader sees only findings, so there is no reason to look at fewer anchors and no reason to hide findings. What keeps the output honest is the **input**: every anchor is genuinely read at both ends before it is placed in a state.

- **Confirmed is positive; mis-target is shown.** An anchor is confirmed only when the fit can be shown, a mis-target only when a divergence can be shown. Neither is asserted on a hunch.
- **Unconfirmed is earned by reading, not by skipping.** It is the honest result of a real read that could confirm nothing — not a shortcut. A critic that marks everything unconfirmed has not done the read; that is a procedure failure, visible in the absence of any per-anchor detail.
- **No cap.** Mis-targets and unconfirmed anchors are concrete, finite defects — one question per anchor — not unbounded speculation. Report every one, ordered by severity (reach × how easily it slips a casual review) so the worst is read first. Ordering is not suppression.

## Output

Per finding: the **anchor** (id, relation, and site), the **kind** (mis-target — wrong target / relation / granularity — or unconfirmed), the **evidence** (for a mis-target, the decision the code implements versus the one named; for an unconfirmed anchor, what blocks confirmation as far as you could determine), the **better fit** where one exists, and a **severity** (reach × slip-likelihood, the misled reader named).

The author dispositions each, ending in exactly one of: **re-anchored** (marker moved, relation changed, or missing spec authored), **confirmed appropriate** (with the reason the fit holds, recorded so a re-run does not re-flag it), **spec sharpened** (an unconfirmed anchor whose spec was under-specified — hand to `clew-critique`), or **accepted** (recorded as inherently ambiguous or deferred, with the reason). Never a TODO left sitting.

## Where it hooks

- **`clew-implement`** — in the review step, over every anchor the increment placed, before the increment is presented. Strongest signal: the anchor is fresh and the placer had full context, so an unconfirmed one is a real defect.
- **Review / PR** — over the anchors in a change the reviewer did **not** place. The independent pass, and the reason the skill exists. Here an unconfirmed anchor may reflect the reviewer's missing local context; disposition accordingly — the placer confirms it, or the spec surfaces the context it depends on.
- **On demand** — critique a named file's or a spec's anchors.
- **Not `clew-promote`** — no anchors at promotion (no code yet); that phase is `clew-critique`'s. Findings warn; they never block, and stay out of `clew check`.

## Done when

- Every anchor in the run was read at both ends and placed in a state — confirmed, mis-target, or unconfirmed — with no lens or altitude filter.
- Every mis-target and unconfirmed anchor is reported, ordered by severity; none is capped or suppressed; the confirmed count is stated.
- Every finding ends re-anchored, confirmed-appropriate (recorded), spec-sharpened, or accepted — no open TODO.
- Nothing was re-anchored without the author's disposition; nothing was gated deterministically.
