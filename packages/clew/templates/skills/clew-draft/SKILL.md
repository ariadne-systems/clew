---
name: clew-draft
description: "Draft a story and the specs it needs in a clew project — choose the lenses, temp-mint ids, and write the drafts into the configured drafts location, ready for review and (on approval) promotion. Use when the user wants to draft or author a new story or spec, or prepare specs before approval — e.g. 'draft a story', 'write the specs for', 'author a spec'. The actual authoring follows the project's own installed drafting and brainstorming skills, while clew's spec conventions stay authoritative. Not promotion (see clew-promote) or code anchoring (see clew-anchor)."
---

# clew-draft

Draft a story and the specs it needs, using clew to allocate ids, and write them as reviewable drafts.
This is the authoring workflow: it produces drafts with **temporary** ids and stops for review; it binds real ids and moves drafts into the spec tree only when the user approves promotion.

## The authoring follows the project's own skills

This skill owns the **clew frame** of drafting — temp-minting ids per lens, grounding the drafts in the corpus (`clew-context`), writing to the configured drafts location, and the spec conventions below (a decision per spec, the title/slug rule, the clarify gate).
It does **not** own *how you author*.
Where the project has installed drafting, spec-authoring, requirements, or brainstorming skills, follow them for the actual authoring — the ideation before a draft, the prose of a story, the shape of the acceptance criteria — just as the code an increment produces follows the project's own implementation skills.

clew's conventions stay authoritative: an installed authoring skill informs *how well* you write a draft, not *what a draft is*.
Where such a skill and these conventions disagree — on the lenses, the decision a spec must pin, the temporary ids, or the drafts location — these win.

## What a lens is

A **lens** is a category of spec — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), and so on.
A project declares its lenses in `.clewrc.json`, each with an `id` and a one-line `description`; the `id` is also the prefix of the ids minted for that kind (lens `SW` → `SW-001`, `SW-002`, …).

## When to use

- The user wants to draft or author a new story and its specs.
- The user wants to prepare specs before they are approved.

If the project has no configuration yet (`error[E_NO_CONFIG]`), stop and ask the user to run `clew setup` first — do not run it yourself; drafting needs the project's lenses and layout.

## What you must not do

- Do not allocate bound ids while drafting. Use temporary ids (`clew mint --tmp <LENS>`); they touch no state, so unapproved drafts never consume real id numbers.
- Do not promote (bind ids, move drafts into the spec tree) until the user approves.
- Do not commit. Leave commits to the user.
- Do not invent a derivation method for a lens you have no guidance for — stop and ask (see Lens coverage).
- Write only inside the configured drafts location; never silently overwrite an existing draft or modify an existing spec — if a target draft path already exists, stop and ask.
- Do not let an installed authoring or brainstorming skill override clew's spec conventions — the lenses, the decision-per-spec rule, the temporary ids, and the drafts location hold regardless of authoring technique.

## Read the project's configuration first

Read the project's configuration to learn:

- the **lenses** — the spec kinds you may mint, each with a description of what it means; these are the only valid spec prefixes.
- the **layout** — where stories, specs, and drafts live, and the story prefix.

Use these as the source of truth: mint only configured lenses, and write drafts to the configured drafts location.

## Lens coverage (before deriving)

For each lens you intend to use, confirm you can derive it:

- The default lenses (`STK`, `SYS`, `SW`, `ARCH`, `NF`, `CON`) — and `ENT`, where the project configures it — are covered in "Deriving through each lens" below.
- For a project-defined lens not covered there, derive from its configured `description`. If that is too thin to author confidently, stop and ask the user what the lens should contain rather than inventing it.

## Procedure

1. **Understand the work item** — what the story is and why it matters. Ask the user where the description is unclear.
2. **Draft the story first** — temp-mint the story id (`clew mint --tmp <story-prefix>`) and write the story draft (title, status (born planned), business value, problem/context, solution approach, acceptance criteria, out of scope) into the `stories/` subfolder of the configured drafts location (mirroring the spec tree). Author every field as a `**Bold label**` line, not a heading — clew detects a field only as a bold label — following the scaffolded example (`docs/spec/schemas/story.example.md`), so the draft passes schema validation on promotion.
3. **Build the context** — run the `clew-context` skill against the draft story. It maps the existing specs the story relates to, what it may affect or supersede, and the gaps it should fill, so the specs you write next are grounded in the corpus rather than invented in isolation.
4. **Create the specs** — using that context, decide which specs the story needs (only configured lenses). **Before minting each, look it up:** grep the existing specs by lens prefix — the spec **filenames** (`SW-002-hold-service.md` = id + slug) are a compact index, cheap to scan even at hundreds, and a spec-set narrows it to the area — for a capability that already covers this need; **reuse or extend an existing spec rather than mint a near-duplicate.** For a genuinely new decision, temp-mint it (`clew mint --tmp <LENS>`) and write it into the `specs/` subfolder of the drafts location (mirroring the spec tree). To allocate several temp ids of one lens, mint them in a **single call with a count** (`clew mint <LENS> <n> --tmp`); temporary numbering increments by scanning the draft filenames already present, so minting one-by-one *before* any draft file exists returns the same `-TMP-001` every time — mint the batch at once, or write each draft before minting the next. Cross-reference by id, wire the relations the context surfaced (what each realizes or concerns, and links to the related existing specs), and follow the project's existing specs as the template — or, on a fresh project with none yet, the scaffolded example beside the schema (`docs/spec/schemas/spec.example.md`), whose `**Bold label**` field form clew validates against.

   **Write every relation link in its post-promotion form — the form it will have once in the spec tree, not the form that resolves from the drafts folder.** A sibling spec is linked by bare filename (`[SW-002](SW-002-hold-service.md)`); a story links a spec as `[SW-002](../specs/SW-002-hold-service.md)`. A link to an **already-promoted** spec will therefore *not* resolve while the draft sits in the drafts folder — that is expected, and the drafts folder is exempt from `clew check`, so it is never flagged there. **Do not "fix" such a link to resolve from the draft** (for example by adding `../../specs/`): promotion moves the file into the spec tree, where your added prefix is now wrong, and the link breaks. `clew promote` substitutes ids, not paths — the path you write is the path that ships.
5. **Clarify — resolve what the drafts leave open** — before presenting, read the drafts back as a set and find what a reader still could not pin down: an acceptance criterion or verification a test or review could not actually check, a spec whose decision or exclusion is still vague, a decision the story implies that no spec covers, a term used but never fixed. Put these to the user **together** — do not guess an answer. Fold each resolution back into the drafts. Every point ends in one of three states — **resolved** in the draft, **explicitly deferred** with the trigger that will resolve it (for example "fixed as the code is built"), or **out of scope** — never a TODO, a TBD, or an open question left sitting in a draft. This gate collects the **non-blocking** completeness points; a blocker that prevents a defensible draft at all — for example missing guidance for a configured lens (see Lens coverage) — is raised when you hit it, not deferred to here. This gate is the drafts' own completeness; how they sit against the existing corpus was step 3's job.
6. **Stop for review** — present the drafts, the ids used, and the context findings (related specs, supersession/conflict candidates), so the user sees how the new work sits in the corpus. Do not promote or commit.

## Every spec pins a decision — no hollow specs

A spec must pin a **decision**: something a reader could not derive from the code and the title alone. Before writing one, name what it requires and — where there is a real choice — what it **excludes**. Drop or fold a candidate that fails this:

- It only restates what the code or the component name obviously does.
- It is a generic umbrella that would fit many sibling artifacts equally (an "X schema" stamped on every record).

Write the spec's **title as that decision**, and give the file a **slug that is the title tightened** — the slug, not the title, becomes the generated traceable an agent reads cold at every anchor (`006`), so the two must tell the same story. Prefer a slug like `concerns-not-coverage` over `compute-coverage`.

The slug is also the **retrieval key**: it is what the look-up in step 4 greps to find whether a capability already exists. So make it a findable capability descriptor (`hold-service`, not `feature-2`), and place the spec in the spec-set for its area — that keeps the look-up small and the corpus searchable as it grows into the hundreds.

Be skeptical of speccing a pure data holder or DTO; it rarely carries a decision worth a spec of its own.

## Deriving through each lens

The configured `description` says what a lens means in this project; the notes below are how to author it well. Keep each spec to one concern, with a verification a test or review can check.

- **Story** (story prefix, e.g. `STR`): the work item — title, business value, problem/context, solution approach, acceptance criteria, out of scope, and the specs it realizes. A story may realize **no** spec — a pure setup or scaffolding increment introduces no new decision of its own; when it realizes none, omit the `Realizes` sub-section entirely rather than inventing a placeholder like "None" (the schema does not require it).
- **SW** (software spec): one observable, verifiable behaviour of a component — what the system does, with a verification a test can run.
- **CON** (constraint): an invariant that must always hold — stated as a rule, with a verification that confirms it holds and that violating it is rejected.
- **ARCH** (architecture spec): a structural rule or design decision, with its rationale.
- **NF** (non-functional spec): a quality attribute such as performance or security, with a measurable verification where possible.
- **STK / SYS** (stakeholder / system spec): a need or capability at the stakeholder or system level, traceable down to the software specs that realize it.
- **ENT** (entity, if the project configures an entity lens): a domain shape — its purpose and its attributes with types; authored as its own spec file like any other lens, with its code type anchored to its id.

## On approval, hand off to promotion

Drafting stops at review.
The approval must refer to the presented draft set; do not read general positive feedback ("looks good") as authorization to promote.
When the user approves the drafts, use the `clew-promote` skill to promote them — it reasons about how the new story and specs fit the existing corpus (relations, supersession, conflicts) and then finalizes them with bound ids in the spec tree.
Promotion is its own step because that integration is judgment over the whole spec graph, not a file move.

## Done when

- A story draft and its spec drafts exist in the configured drafts location, each with a **temporary** id.
- Every draft uses only configured lenses and cross-references the related specs the context surfaced.
- Every ambiguity the clarify pass surfaced is resolved in a draft, explicitly deferred with a named trigger, or out of scope — no draft carries an open question.
- The drafts, the ids used, and the context findings are presented to the user for review.
- Nothing is promoted, no bound id is minted, and nothing is committed.
