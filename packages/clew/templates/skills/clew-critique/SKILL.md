---
name: clew-critique
description: "Critique a spec for sufficiency — surface where it pins a decision but leaves out something whose absence is materially dangerous (a security boundary, a concurrency assumption, an error path, a data-integrity or boundary case), so an under-specified requirement is caught before code is built to it. Scope is derived from the project's configured lenses and each spec's content, never a fixed lens list. Read-only and advisory: it proposes candidate gaps for the author to disposition, never rewrites a spec or gates the build. Use when a risk-bearing spec is authored or under review — e.g. 'critique CON-034', 'is this NF spec complete?', 'what's missing from this security spec?'. Not spec authoring (clew-draft), and distinct from coverage, which checks code-to-spec alignment, not spec completeness."
---

# clew-critique

Critique a spec for **sufficiency**: surface where it pins a decision but leaves out something whose absence is materially dangerous — a security boundary, a concurrency assumption, an error path, a data-integrity or boundary case — so an under-specified requirement is caught before code is built to it.

Everything else clew checks is **integrity** (references resolve, the trace link is real) or **alignment** (the code realizes what the spec says). All of it takes the spec as ground truth. A spec can be fully Covered — realized, verified, green — and still specify the wrong or an incomplete system, and nothing sees it. This skill asks the orthogonal question: not *does the code match the spec* but *does the spec say enough*.

It is judgment, not a deterministic check — so it is **advisory**: it never rewrites a spec, never gates the build, and is never a `clew check` member. It is the layer above the `clew-draft` "no hollow specs" guard — that asks whether a spec pins a decision at all; this asks whether it pins **enough**.

## When to use

- After authoring a risk-bearing spec in `clew-draft`, before the drafts are presented.
- As an optional step in `clew-promote`, on a risk-bearing spec entering the corpus.
- On demand: "critique CON-034", "is this NF spec complete?".

## When not to use

- On a spec with no risk-bearing content — a plain data holder, a presentational behaviour. The content gate below filters these out; do not critique everything.
- As a code review — critique the **spec's** completeness, never the implementation. That is coverage's and code review's job.
- As a pass/fail gate — it is advisory; its output is dispositioned by a human.

## What you must not do

- **Do not hardcode lens ids.** Lenses are project-configured; a project may not have `NF`/`CON`, may name them differently, or define custom ones. Derive scope from the configured lenses and the spec's content (see *Scope*). Keying off a lens *id* instead of the property you mean is the exact failure this skill must not make.
- **Do not rewrite the spec.** Propose candidate gaps; the author dispositions each.
- **Do not enumerate every conceivable concern.** A gap you cannot make concrete — a real failing scenario — is not reported (see *Bounding*).
- **Do not treat a deliberate exclusion as a gap.** A spec that says "single-threaded; concurrency out of scope" has *addressed* concurrency.

## Scope — derive it, never assert it

Decide what to critique from the project's configuration and each spec's content, in three layers. None names a lens id.

1. **Prefilter from the configured lens descriptions** — a cheap hint, not the gate. Read each lens's `id` and one-line `description`; judge which are **risk-bearing** — a lens whose description expresses an invariant/constraint, or a quality / non-functional / security / safety viewpoint — whatever it is called. This only bounds cost.
2. **Gate on the spec's content** — the real trigger. The trigger is a property of the *claim*, not its filing: does the spec make a claim in one of the risk categories below? A risk-bearing claim is critiqued whatever lens it lives in; a benign one is skipped even inside a "risky" lens.
3. **Fall back honestly.** If no lens description reads as clearly risk-bearing, do not silently target nothing — scan by content across the corpus, or **ask the user** which lenses carry risk in this project. Never guess.

## Risk categories and their checklists

The categories are universal software-risk categories, attached to the spec's **content**, not to any lens name. Detect which a spec's claim touches, then run only those checklists. Each entry is a *prompt to check*, not an assertion the spec is wrong.

- **Trust boundary / security** — validates or trusts input, checks authorization, handles secrets, crosses a trust boundary.
  Check: input normalization/canonicalization **before** a check; authn vs authz; TOCTOU; replay; injection; a secret in logs or errors; failing **open** vs closed.
- **Concurrency / ordering** — shared mutable state, parallel execution, locks, atomicity.
  Check: interleavings; lost updates; the invariant that must hold *across* the operation; whether an ordering rule is even *falsifiable* on this store; idempotency of retries.
- **Data integrity / state** — invariants over persisted data, uniqueness, migration.
  Check: the invariant under partial write; uniqueness/collision; migration of existing data; what a stale or duplicate record does downstream.
- **Error / failure paths** — anything that can fail.
  Check: the behaviour on failure; partial failure and rollback; an error's classification preserved vs collapsed; retry/backoff; the unhappy path a happy-path spec omits.
- **Boundary / domain** — the range of inputs.
  Check: empty / zero / max / negative / overflow; encoding and unicode; the degenerate case; off-by-one at the stated edge.
- **Resource / limits** — anything that grows or waits.
  Check: unbounded growth; exhaustion; timeout; the absent cap.

Ship these universal checklists with the skill. When a project needs domain-specific risk (monetary rounding, PII, safety-critical), read an optional `docs/spec/risk-checklist.md` and append it — a file, not a config section, added on demand.

## Procedure

For each targeted spec:

1. **Read its intent** — Description, Rationale, Verification — and enough context to know what it governs (use `clew-context` where the change is code-adjacent).
2. **Detect the categories** its claim touches.
3. **Run those checklists** — for each, ask "does the spec address this?"; note each silence.
4. **Prove materiality.** For each silence, construct a **concrete failing scenario**: specific inputs or state, leading to a wrong or unsafe outcome the spec would permit. **A silence for which no concrete scenario can be constructed is discarded, not reported.**
5. **Check falsifiability.** Could the spec's stated Verification actually *fail* if the spec were violated? If not, that is itself a reported insufficiency. (The test-level analog — a `verifies` test that can fail — belongs to `clew-implement` / `clew-anchor`.)
6. **Rank and bound**, then present — do not apply.

## Bounding and ranking — the signal-to-noise discipline

A critic that always finds something is noise. Three rules keep it honest:

- **Concrete-scenario requirement.** Every reported gap names a specific failure (inputs, then wrong outcome). "Consider concurrency" is not a finding; "two `confirm` calls on the same hold interleave and double-book, and the spec states no atomicity" is. This is the primary gate — it forces you to *prove* a gap is real.
- **Materiality gate and soft cap.** Report every gap clearing a materiality threshold (consequence times likelihood), ordered by materiality; a soft cap of about five is only a backstop. If more clear the threshold, report the top few and say "the spec has systemic gaps; N more of category X suppressed" — do not silently truncate.
- **Default to sufficient.** Argue *for* a gap with evidence; absent a concrete scenario, the verdict is "the spec is adequate." Adversarial in effort, conservative in claim.

## Output

Per candidate gap: the **category**, a **concrete failure scenario** (inputs, then wrong or unsafe outcome), the **spec's silence** (what it does not say that permits it), a **suggested addition** (the smallest clause that closes it), and a **materiality** (high or medium, consequence named).

The author dispositions each, ending in exactly one of: **folded into the spec**, **explicitly deferred** (with the trigger that resolves it), or **out of scope** (recorded as a deliberate exclusion, so a later reader — and this skill on re-run — sees it was decided, not missed). Never a TODO left sitting.

## Where it hooks

- **`clew-draft`** — after a risk-bearing spec is authored, before drafts are presented; fold accepted gaps in, record rejected ones as explicit exclusions. Highest leverage: the spec is fixed before code is built to it.
- **`clew-promote`** — a **process** gate, not a content one: require that the critique was run and dispositioned on a risk-bearing spec, never "zero gaps". Findings warn; they never deterministically block, and they stay out of `clew check`.
- **On demand** — critique a named spec.

## Done when

- Scope was derived from the configured lenses and spec content — no hardcoded lens id; where the config was unclear, the user was asked.
- Each reported gap carries a concrete failure scenario and a materiality; the output is bounded and ranked.
- Every gap ends folded-in, explicitly deferred, or recorded out-of-scope — no open TODO.
- Nothing was rewritten without the author's disposition; nothing was gated deterministically.
