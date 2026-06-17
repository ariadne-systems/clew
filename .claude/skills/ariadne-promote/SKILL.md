---
name: ariadne-promote
description: Promote reviewed draft stories and specs into the approved spec corpus — reason about how they fit the existing specs (relations, supersession, conflicts), reconcile, then finalize them with bound ids in the spec tree. Use when the user approves drafts and wants to promote, approve, or finalize a story and its specs.
---

# ariadne-promote

Promote reviewed drafts into the approved spec corpus.
Promotion is two things, and the first is the important one: **integrate** the new story and specs into the existing body of specs, then **finalize** them with bound ids in the spec tree.
Do not treat this as a file move — a new story can change what existing specs mean.

## When to use

- The user has reviewed drafts (see the `ariadne-draft` skill) and approves promoting them.
- The user asks to promote, approve, or finalize a story and its specs.

## Invoking the CLI

This skill writes commands as `ariadne <command>`, but how the CLI actually runs varies by project — resolve it before running anything:

- If `ariadne` is on the PATH, use it directly.
- If `@ariadne-thread/cli` is a project dependency, invoke the local binary through the project's package manager — for example `pnpm exec ariadne …` or `npx ariadne …`.
- Inside the tool's own source repository, use its dev runner (for example a `pnpm dev …` / `pnpm mint …` script).

Confirm the invocation and command surface with `ariadne --help` and `ariadne <command> --help` before acting.

## What you must not do

- Do not bind ids or move files until the integration below is settled — integration may reveal a draft should change or not be promoted, and temporary ids let that happen without burning real numbers.
- Do not silently rewrite, retire, or delete existing specs. Surface every proposed change and confirm it with the user.
- Do not commit. Leave commits to the user, and tell them the state file advanced.

## Procedure

### 1. Gather the drafts

Collect the drafts to promote — the pending drafts in the configured drafts location, or the specific ones the user named.
Read the project's configuration for the layout (where stories, derived specs, and the domain model live) and the lenses, so you know where each draft belongs and which prefixes are valid.

### 2. Integrate — reason about the corpus (the part only an agent can do)

Read the existing specs and work out what the new story and specs mean for the whole:

- **Relations** — which existing specs the new ones relate to: what each new spec realizes or concerns, and which existing specs should now reference the new ones. Plan the cross-references in both directions.
- **Supersession / obsolescence** — whether a new spec replaces or makes an existing one obsolete. Do not retire anything silently; propose it and confirm with the user.
- **Conflicts** — whether a new spec contradicts an existing one. Stop and resolve the conflict with the user before promoting; do not promote a contradiction into the corpus.
- **Duplication** — whether a draft restates something that already exists; if so, it may not need promoting at all.

Present these findings and proposed edits (to the drafts and to any affected existing specs) and get the user's confirmation. This reconciliation is the point of promotion.

### 3. Finalize — bind and move (mechanical)

Once integration is confirmed:

1. **Bind the ids** — `ariadne mint <LENS>` (without `--tmp`) for each draft; this allocates the real id and advances the state. The lens is the temporary id's prefix.
2. **Substitute** every temporary id with its bound id everywhere it appears — the drafts' bodies, their cross-references, the agreed references in existing specs, and the filenames.
3. **Move** each draft into its place in the spec tree per the layout; merge an entity draft into the domain model as a section rather than a standalone file.
4. **Apply** the confirmed edits to affected existing specs (new relations, supersession notes).

### 4. Report

Summarize what was promoted (temp id → bound id), the relations added, and any existing specs changed.
Leave committing to the user, and remind them the state file advanced so it is committed alongside the promoted specs.
