# Skill reference

clew's **skills** are how you drive the tool: your AI coding agent runs them from your plain-language direction, rather than you typing them as commands.
Each skill does the **judgment** work of one step — the reasoning a command cannot — and calls the `clew` CLI underneath for the [deterministic parts](commands.md) (minting ids, generating traceables, binding drafts).

The skills carry one loop:

**draft → promote → implement & anchor → check coverage**

`clew-draft`, `clew-promote`, and `clew-implement` carry those steps end to end — and `clew-implement` folds the coverage check into itself, closing an increment only once its target specs report **Covered**, rather than leaving it a step you run afterwards.
`clew-setup` establishes the project up front, `clew-context` grounds the work in the corpus, and `clew-critique` stress-tests a risk-bearing spec's sufficiency.
You can still run `clew coverage` / `clew check` yourself — or in CI — as the assurance view over the whole corpus.

`clew setup` emits these skills into your agent's skills directory, so after setup the agent already knows the loop.
None of them creates a version-control commit; the ones that change files stop for your review first.

| Skill | Role |
| --- | --- |
| `clew-setup` | Establish the project's foundations — contract and architecture |
| `clew-draft` | Author a story and its specs as reviewable drafts |
| `clew-context` | Read-only analysis of the corpus around the work |
| `clew-critique` | Stress-test a risk-bearing spec's sufficiency (advisory) |
| `clew-promote` | Integrate drafts into the corpus and finalize them |
| `clew-implement` | Take a promoted spec through to Covered |
| `clew-anchor` | Bind code and tests to existing specs |

New to *corpus*, *traceable*, *anchor*, or *coverage*? See [What is CAS-DD?](../concepts/what-is-cas-dd.md) and [The spec lifecycle](../concepts/spec-lifecycle.md) for the terms these skills use.

## `clew-setup`

Establish the project *after* the `clew setup` command has scaffolded it.
Fills the **technology contract** (`004`) and the **architecture overview** (`docs/spec/architecture.md`), and — for a new project, or an existing one whose workspace has drifted — drafts a **workspace-setup story**.
Works greenfield by interview, or on an existing project by deriving the stack and architecture from its build files, code, and docs (on your confirmation).
Produces documents and a draft only — it never builds the workspace; that is the story's job once you promote it.
This is not the `clew setup` *command* (that scaffolds the configuration and emits the method).

## `clew-draft`

Author a story and the specs it needs as reviewable **drafts** with *temporary* ids, so unapproved work never consumes real id numbers.
It runs `clew-context` to ground the specs in the corpus rather than invent them in isolation, then stops for your review.
Before minting each spec it **looks the corpus up** — the spec filenames (`SW-002-hold-service.md` = id + slug) are a compact capability index — and **reuses or extends an existing spec rather than minting a near-duplicate**, so the corpus stays a [registry of what the system already does](../concepts/what-is-cas-dd.md) instead of accreting near-copies.
The **actual authoring** follows your project's own installed drafting, spec-authoring, or brainstorming skills — clew owns only the frame (temporary ids, corpus grounding, the drafts location, and its spec conventions), and where an authoring skill and those conventions disagree, the conventions win.
It binds no ids and moves nothing into the tree — that is promotion.

## `clew-context`

Read-only analysis that builds the map around a story being drafted or promoted — or around a change to already-anchored code.
It gathers the specs the work relates to directly, then walks three ways from the code:

- **Across** — the call graph: the behaviours the code interacts with.
- **Sideways** — a spec's other anchors: a sibling implementation or distant test that shares the same intent without ever touching the call path.
- **Up** — the containment tree: the high-altitude `STK`/`SYS` specs that govern where the code lives.

On top of those it surfaces supersession, conflict, and gap candidates.
It grounds drafting and promotion; it also grounds a code change, because an anchor is a *claim*, not a proof — so you read the spec's intent before changing the code.
It authors and finalizes nothing.

## `clew-critique`

Stress-test a **risk-bearing** spec for **sufficiency** — where it pins a decision but leaves out something whose absence is materially dangerous: a security boundary, a concurrency assumption, an error path, a data-integrity or boundary case.
It is **read-only and advisory** — it proposes candidate gaps for you to disposition, and never rewrites a spec or gates the build.
Its scope is derived from your configured lenses and each spec's content, not a fixed checklist.
Use it when a risk-bearing spec is authored or under review — distinct from **coverage**, which checks code-to-spec alignment rather than whether the spec itself is complete, and from `clew-context`, which grounds a spec in the corpus rather than judging its internal sufficiency.

## `clew-promote`

Finalize reviewed drafts into the corpus. It is two steps, and the first is the one that matters:

1. **Integrate** — reconcile the new story and specs with the existing corpus (relations, supersession, conflicts, duplication) and confirm the changes with you, so a new story can adjust what existing specs mean rather than just landing beside them.
2. **Finalize** — run `clew promote` to bind a real id to each draft, substitute temporary ids, and move the drafts into the spec tree.

It then applies the confirmed integration edits to affected specs, each with its `## Changes` entry.

## `clew-implement`

Close one increment: take a promoted spec through to **Covered**.
It activates the spec and regenerates the traceables, reads the spec's intent (delegating to `clew-context`), implements and tests the behaviour **following your project's own installed implementation and testing skills**, anchors the code and test (delegating to `clew-anchor`), then verifies coverage — closing the increment only once the target spec reports **Covered**.
It owns only the clew frame around the work — it does not re-specify how you write code.
**Covered proves the spec-to-code link, not correctness**, so it presents the change for review; the code and tests still need real review.

## `clew-anchor`

Bind code to the specs it `realizes`, `verifies`, or `concerns`, using the generated **trace markers**, so the link is checked by the build instead of asserted in a comment that rots.
It resolves the traceables folder from the configuration and follows the generator's own documentation for the marker form in your target language.
It adds markers for spec ids that **already exist**; it never authors or promotes specs (`clew-draft`, `clew-promote`) and never invents an id.

## Next

- [Quickstart](../getting-started/quickstart.md) — the skills driving the loop end to end.
- [Command reference](../reference/commands.md) — the deterministic operations the skills call underneath.
- [The spec lifecycle](../concepts/spec-lifecycle.md) — the loop the skills carry a spec through.
