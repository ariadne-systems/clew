---
name: ariadne-draft
description: Draft a story and the specs it needs in an ariadne project — choose the lenses, temp-mint ids, and write the drafts into the configured drafts location, ready for review and (on approval) promotion. Use when the user wants to draft or author a new story or spec, or prepare specs before approval.
---

# ariadne-draft

Draft a story and the specs it needs, using ariadne to allocate ids, and write them as reviewable drafts.
This is the authoring workflow: it produces drafts with **temporary** ids and stops for review; it binds real ids and moves drafts into the spec tree only when the user approves promotion.

## When to use

- The user wants to draft or author a new story and its specs.
- The user wants to prepare specs before they are approved.

If the project has no configuration yet (`error[E_NO_CONFIG]`), use the `ariadne-setup` skill first; drafting needs the project's lenses and layout.

## Invoking the CLI

This skill writes commands as `ariadne <command>`, but how the CLI actually runs varies by project — resolve it before running anything:

- If `ariadne` is on the PATH (a global install), use it directly.
- If `@ariadne-thread/cli` is a project dependency, invoke the local binary through the project's package manager — for example `pnpm exec ariadne …` or `npx ariadne …`.
- Inside the tool's own source repository, use its dev runner (for example a `pnpm dev …` / `pnpm mint …` script).

Confirm the invocation and the exact command surface with `ariadne --help` and `ariadne <command> --help` before acting; read the help rather than assuming a command's arguments or flags.

## What you must not do

- Do not allocate bound ids while drafting. Use temporary ids (`ariadne mint --tmp <LENS>`); they touch no state, so unapproved drafts never consume real id numbers.
- Do not promote (bind ids, move drafts into the spec tree) until the user approves.
- Do not commit. Leave commits to the user.
- Do not invent a derivation method for a lens you have no guidance for — stop and ask (see Lens coverage).

## Read the project's configuration first

Read the project's configuration to learn:

- the **lenses** — the spec kinds you may mint, each with a description of what it means; these are the only valid spec prefixes.
- the **layout** — where stories, derived specs, and drafts live, and the story and entity prefixes.

Use these as the source of truth: mint only configured lenses, and write drafts to the configured drafts location.

## Lens coverage (before deriving)

For each lens you intend to use, confirm you can derive it:

- The default lenses (`STK`, `SYS`, `SW`, `ARCH`, `NF`, `CON`) are covered in "Deriving through each lens" below.
- For a project-defined lens not covered there, derive from its configured `description`. If that is too thin to author confidently, stop and ask the user what the lens should contain rather than inventing it.

## Procedure

1. **Understand the work item** — what the story is and why it matters. Ask the user where the description is unclear.
2. **Choose the lenses** — decide which specs the story needs (for example an `SW` for a behaviour, a `CON` for an invariant, an `ENT` for a new domain shape). Use only configured lenses.
3. **Temp-mint the ids** — run `ariadne mint --tmp <LENS>` for the story's own prefix and for each spec. Temporary ids are stateless, so order and repetition are safe.
4. **Write the drafts** — into the configured drafts location, mirroring the spec tree (a stories area and a derived-specs area; an entity draft is a domain-model section, to be merged on promotion). Use the temporary ids, cross-reference specs by id, and follow the project's existing specs as the template (and any schema the project defines for the required fields).
5. **Stop for review** — present the drafts and the ids used; do not promote or commit.

## Deriving through each lens

The configured `description` says what a lens means in this project; the notes below are how to author it well. Keep each spec to one concern, with a verification a test or review can check.

- **Story** (story prefix, e.g. `STR`): the work item — title, business value, problem/context, solution approach, acceptance criteria, out of scope, and the specs it realizes.
- **SW** (software spec): one observable, verifiable behaviour of a component — what the system does, with a verification a test can run.
- **CON** (constraint): an invariant that must always hold — stated as a rule, with a verification that confirms it holds and that violating it is rejected.
- **ARCH** (architecture spec): a structural rule or design decision, with its rationale.
- **NF** (non-functional spec): a quality attribute such as performance or security, with a measurable verification where possible.
- **STK / SYS** (stakeholder / system spec): a need or capability at the stakeholder or system level, traceable down to the software specs that realize it.
- **ENT** (entity): a domain shape — its purpose and its attributes with types; lives as a section in the domain model, not a standalone file.

## On approval, hand off to promotion

Drafting stops at review.
When the user approves the drafts, use the `ariadne-promote` skill to promote them — it reasons about how the new story and specs fit the existing corpus (relations, supersession, conflicts) and then finalizes them with bound ids in the spec tree.
Promotion is its own step because that integration is judgment over the whole spec graph, not a file move.
