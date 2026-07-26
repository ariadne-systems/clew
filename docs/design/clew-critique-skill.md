# clew-critique — design draft

> Status: **design for review**, not an installed skill. On approval it becomes
> `.claude/skills/clew-critique/SKILL.md` (+ the shipped `packages/clew/templates/skills/` copy).
> Addresses robustness backlog **#2** (requirement-sufficiency critic).

## One-line

Critique a spec for **sufficiency** — surface where the spec, though it pins a decision, leaves out something whose absence is materially dangerous (a security boundary, a concurrency assumption, an error path, a data-integrity or boundary case) — so an under-specified requirement is caught before code is built to it.

## The blind spot it addresses

Everything else clew does checks **integrity** (do references resolve, is the trace link real) or **alignment** (does the code realize what the spec says). All of it takes the spec as ground truth. A spec can be fully Covered — realized, verified, green — and still specify the wrong or an incomplete system, and nothing sees it, because the machinery never asks whether the spec itself is adequate.

This skill is the only thing that asks the orthogonal question: **not "does the code match the spec?" but "does the spec say enough?"** It is judgment, not a deterministic check — so it is a skill, advisory, never a `clew check` member and never a build gate.

It is the layer **above** the `clew-draft` "no hollow specs" guard: that asks *does this spec pin a decision at all*; this asks *does it pin **enough***. It **feeds** the verify-falsifiability discipline (backlog #3): a spec whose verification could not actually fail is one kind of insufficiency.

## When to use

- After authoring a risk-bearing spec in `clew-draft`, before the drafts are presented.
- As an optional gate in `clew-promote`, on risk-bearing specs entering the corpus.
- On demand: "critique CON-034 for sufficiency", "is this NF spec complete?".

## When NOT to use

- On specs with no risk-bearing content (a plain data-holder, a presentational behaviour) — the content gate below filters these out; do not critique everything.
- As a code review — it critiques the **spec's** completeness, never the implementation (that is coverage's and code-review's job).
- As a pass/fail gate that blocks the build deterministically — it is advisory; its output is dispositioned by a human.

## What it must not do

- **Do not hardcode lens ids.** Lenses are project-configured (ADR-0003); a project may not have `NF`/`CON`, may name them differently, or define custom ones. Derive scope from the configured lenses and spec content (see *Scope*). *(This is the [[skills-derive-from-configured-lenses]] rule; violating it is the B1/#2 anti-pattern.)*
- **Do not rewrite the spec.** Propose candidate gaps; the author dispositions each.
- **Do not enumerate every conceivable concern.** A gap that cannot be made concrete (a real failing scenario) is not reported (see *Bounding*).
- **Do not treat a deliberate exclusion as a gap.** A spec that says "single-threaded; concurrency out of scope" has *addressed* concurrency.

## Scope — derived, never asserted

The critic decides *what to critique* from the project's actual configuration and each spec's content, in three layers. None names a lens id.

1. **Prefilter from configured lens descriptions (a cheap hint, not the gate).**
   Read each configured lens's `id` + one-line `description`. Judge *semantically* which lenses are risk-bearing — a lens whose description expresses an **invariant / constraint**, or a **quality / non-functional / security / safety** viewpoint — whatever it is called (`CON`, `NF`, `INV`, `QoS`, `SEC`, a custom lens…). This only bounds cost.
2. **Gate on the spec's content (the real trigger).**
   The trigger is a property of the *claim*, not its filing: does the spec make a claim where under-specification is dangerous (one of the risk categories below)? A risk-bearing claim is critiqued whatever lens it lives in; a benign one is skipped even inside a "risky" lens.
3. **Fall back honestly.**
   If no lens description reads as clearly risk-bearing, do not silently target nothing: scan by content across the corpus, or **ask the user which lenses carry risk in this project** — never guess. (Same discipline `clew-draft` uses for an unfamiliar lens.)

## Risk categories and their checklists

The categories are **universal software-risk categories**, attached to the spec's *content*, not to any lens name — so they are robust to any configuration. The critic detects which categories a spec's claim touches, then runs only those checklists.

- **Trust boundary / security** — validates or trusts input, checks authorization, handles secrets/tokens, crosses a trust boundary.
  *Missing-often:* input normalization/canonicalization **before** a check; authn vs authz confusion; TOCTOU; replay; injection; secret in logs/errors; failing **open** vs closed.
- **Concurrency / ordering** — shared mutable state, parallel execution, locks, atomicity.
  *Missing-often:* interleavings; lost updates; the invariant that must hold *across* an operation; whether the ordering rule is even *falsifiable* (can it fail on this store?); idempotency of retries.
- **Data integrity / state** — invariants over persisted data, uniqueness, migration.
  *Missing-often:* the invariant under partial write; uniqueness/collision; migration of existing data; what a stale/duplicate record does downstream.
- **Error / failure paths** — anything that can fail.
  *Missing-often:* the behaviour on failure; partial failure and rollback; error classification preserved vs collapsed; retry/backoff; the unhappy path the happy-path spec omits.
- **Boundary / domain** — the range of inputs.
  *Missing-often:* empty / zero / max / negative / overflow; encoding/unicode; the degenerate case; off-by-one at the stated edge.
- **Resource / limits** — anything that grows or waits.
  *Missing-often:* unbounded growth; exhaustion; timeout; the absent cap.

Each entry is a *prompt to check*, not an assertion the spec is wrong. The universal checklists ship with the skill (v1). Project-specific risk (monetary rounding, PII, safety-critical) is **not** configured speculatively: when a project needs it, the skill reads an optional `docs/spec/risk-checklist.md` and appends it to the universal categories — a file, not a `.clewrc.json` section — added on demand, not built up front.

## Procedure (per targeted spec)

1. **Read the spec's intent** — Description, Rationale, Verification — and enough surrounding context to know what it governs (reuse `clew-context` where the change is code-adjacent).
2. **Detect touched categories** — which risk categories the spec's claim actually involves.
3. **Run those checklists** — for each, ask "does the spec address this?"; note each silence.
4. **Prove materiality** — for each silence, construct a **concrete failing scenario**: specific inputs/state → a wrong or unsafe outcome the spec would permit. **A silence for which no concrete scenario can be constructed is discarded, not reported.**
5. **Check falsifiability** (#3) — could the spec's stated verification actually *fail* if the spec were violated? If not, that is itself a reported insufficiency.
6. **Rank and bound** — order surviving gaps by materiality (consequence × likelihood); keep the top few (default ≤ 5); drop nitpicks.
7. **Present, do not apply** — emit the candidate gaps for disposition.

## Bounding & ranking — the signal-to-noise discipline (make-or-break)

A critic that always finds something is noise people learn to ignore. Three rules keep it honest:

- **Concrete-scenario requirement.** Every reported gap names a specific failure (inputs → wrong outcome). "Consider concurrency" is not a finding; "two `confirm` calls on the same hold interleave and double-book, and the spec states no atomicity" is. This is the primary anti-noise gate — it forces the critic to *prove* a gap is real, mirroring the adversarial-verify / ReportFindings `failure_scenario` discipline.
- **Materiality gate + soft cap.** Report every gap clearing a materiality threshold (consequence × likelihood), ordered by materiality; a soft cap (~5) is only a backstop. If *more* than the cap clear the threshold, that overflow is itself a finding — report the top few and say "the spec has systemic gaps; N more of category X suppressed", rather than silently truncating. The cap is not a quota and is not risk-tiered (materiality already encodes risk).
- **Default to sufficient.** The critic argues *for* a gap with evidence; absent a concrete scenario, its verdict is "the spec is adequate." It is adversarial in *effort*, conservative in *claim*.

## Output format

Per candidate gap:
- **category** (trust-boundary, concurrency, …)
- **failure scenario** — concrete inputs/state → wrong/unsafe outcome
- **the spec's silence** — what it does not say that permits the scenario
- **suggested addition** — the smallest clause that would close it
- **materiality** — high / medium, with the consequence named

Each is dispositioned by the author, ending in exactly one of: **folded into the spec**, **explicitly deferred** (with the trigger that resolves it), or **out of scope** (recorded as a deliberate exclusion, so a later reader — and the critic on re-run — sees it was decided, not missed). Never a TODO left sitting.

## Workflow hooks

- **`clew-draft`** — after authoring a risk-bearing spec, run the critique before presenting drafts; fold accepted gaps in, record rejected ones as explicit exclusions. Highest leverage: the spec is fixed before any code is built to it.
- **`clew-promote`** — a **process** gate, not a content one: on a risk-bearing draft, require that the critique was *run and its findings dispositioned* ("did you look and decide"), never "zero gaps". Findings **warn**; they never deterministically block, because the critique is judgment and non-reproducible — it stays out of `clew check`. A project may treat a material gap as a stop condition in its own process.
- **On demand** — critique a named spec.

## Failure modes to guard

- **Noise / always-finds-something** → the concrete-scenario requirement + materiality cap + default-to-sufficient.
- **Scope creep into code review** → it critiques spec completeness only; implementation defects are coverage's / code-review's job.
- **Over-firing on benign specs** → content gate, not a lens-blanket sweep.
- **Analysis paralysis** → bounded output, each gap dispositioned, then move on.
- **Configuration fragility** → scope derived from config + content, never a fixed lens list.

## Done when

- Scope was derived from the project's configured lenses + spec content (no hardcoded lens id); where the config was unclear, the user was asked.
- Each reported gap carries a concrete failure scenario and a materiality; the output is bounded and ranked.
- Every gap ends folded-in, explicitly deferred, or recorded out-of-scope — no open TODO.
- Nothing was rewritten without the author's disposition; nothing was gated deterministically.

## Decisions (resolved 2026-07-26)

1. **Name** — `clew-critique`. Verb, consistent with the skill family; the description pins it to sufficiency. (`clew-sufficiency` is the runner-up if a property-noun name is preferred.)
2. **Cap** — materiality threshold is the gate; a soft cap (~5) is a backstop; overflow beyond it is reported as a systemic-insufficiency signal, not truncated. Not a flat quota, not risk-tiered.
3. **Promote gate** — warn-only; a *process* gate (critique was run and dispositioned), never a deterministic content block, and never in `clew check`. Judgment findings are non-reproducible, so they cannot gate a build.
4. **Checklists** — universal categories ship in the skill (v1); project-specific extension is deferred to an optional `docs/spec/risk-checklist.md` file convention, added on demand — not `.clewrc.json`, not built speculatively.
5. **Falsifiability (#3)** — split by altitude: spec-level falsifiability (is the Verification Description falsifiable) is a facet of this skill; test-level falsifiability (the actual `verifies` test encodes the failing case) is a one-line discipline in `clew-implement`/`clew-anchor`.
