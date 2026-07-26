# The spec lifecycle

A spec moves through a small set of states, and clew's workflow is the loop that carries it — and the code anchored to it — from idea to checked coverage.

## Status: planned, active, deprecated

Every spec in the corpus carries a **`Status`** field:

- **`planned`** (the default) — authored and approved, but not yet built.
  It generates **no** traceable, so it is outside coverage and cannot be anchored.
  It keeps a backlog out of the coverage view without waiving it.
- **`active`** — being built, or in service.
  It generates a traceable, so code can anchor it; coverage then shows whether code actually does.
- **`deprecated`** — retiring.
  Its traceable is still generated but marked, so existing anchors keep compiling while coverage lists it without counting it.

A spec becomes `active` when work on it **begins** — the implement skill makes that transition as its first step, generating the traceable so code can anchor it as it is written rather than after the fact.
You direct the agent to implement a spec; you do not flip the status by hand.

## The loop

```
draft  →  promote  →  implement & anchor  →  check coverage  →  (next increment)
```

The first three steps are driven by clew's **skills**, run by your AI coding agent — you direct and review, rather than running commands by hand; the implement skill folds the coverage check for its own specs into that step.
Running `clew coverage` / `clew check` yourself is the whole-corpus assurance view, for you or CI.

- **Draft** (draft skill) — the agent authors a story and the specs it needs with *temporary* ids, so unapproved work never consumes real id numbers; it grounds them in the corpus via the context skill.
- **Promote** (promote skill) — the agent reconciles the drafts with the existing corpus and finalizes them with bound ids in the spec tree.
  A story carries its specs through its references, and promotion is atomic.
- **Implement & anchor** (implement skill) — the agent activates the spec, regenerates the traceables, implements and tests it the way your project works, anchors it (`realizes` / `verifies`) via the anchor skill, then verifies the spec reports **Covered** — the increment closes only once it does.
- **Check coverage** — the whole-corpus assurance view: `clew coverage` reports what is realized and verified, and `clew check` runs the integrity suite. The implement skill already confirmed the increment's own specs; this is where you, or CI, read the corpus as a whole.

Each turn of the loop is one increment: a spec becomes active, its code lands anchored, and coverage moves it from open gap to done.

## Keeping the corpus in step

A story rarely starts on empty ground.
When its work touches code that already carries anchors, the loop does more than add new specs: the agent follows those anchors to the specs behind the code and reconciles them — reading each as a claim to check against the code, revising any the change has outgrown, with a `## Changes` entry saying why.
The corpus does not only grow at its edges; it stays current wherever the work reaches.
A spec no one has touched in a year still describes the code, because the last change that passed through kept it that way.

## Ids: temporary and bound

While drafting, ids are **temporary** (`SW-TMP-…`) and touch no state.
Promotion **binds** them — minting a real, gap-free number and moving the draft into the tree, renamed to its bound id.
A sequence number is never reused.

## Change tracking

Once a spec is in the corpus, every change to it is recorded in a `## Changes` section at the end of the file — when, and why.
The history of intent is part of the record, just as the anchors keep the history of the link.

## Next

- [Quickstart](../getting-started/quickstart.md) — run the loop end to end.
- [Skill reference](../reference/skills.md) — the skills that drive the loop.
- [Command reference](../reference/commands.md) — every command in the loop.
