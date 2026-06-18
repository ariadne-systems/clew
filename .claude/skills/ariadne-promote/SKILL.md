---
name: ariadne-promote
description: Promote reviewed draft stories and specs into the approved spec corpus — reason about how they fit the existing specs (relations, supersession, conflicts), reconcile, then finalize them with bound ids in the spec tree. Use when the user approves drafts and wants to promote, approve, or finalize a story and its specs.
---

# ariadne-promote

Promote reviewed drafts into the approved spec corpus.
Promotion is two things, and the first is the important one: **integrate** the new story and specs into the existing body of specs, then **finalize** them with bound ids in the spec tree.
Do not treat this as a file move — a new story can change what existing specs mean.

## What a lens is

A **lens** is a kind of spec — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), and so on.
A project declares its lenses in `.ariadnerc.json`, each with an `id` and a one-line `description`; the `id` is also the prefix of the ids minted for that kind (lens `SW` → `SW-001`, `SW-002`, …).

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

### 2. Integrate — reconcile with the corpus (the part only an agent can do)

First, make sure the corpus context exists.
If it was already built while drafting (the `ariadne-context` skill), reuse it; if not, build it now with `ariadne-context`.
It maps what the new story and specs relate to, what they may supersede or make obsolete, what they may conflict with, and whether any draft merely duplicates an existing spec.

Then act on that context: present the proposed relations and the supersession, conflict, and duplication candidates, with the edits they imply — to the drafts and to any affected existing specs — and get the user's confirmation.
Do not retire or change an existing spec silently, and do not promote a contradiction or a duplicate into the corpus.
This reconciliation is the point of promotion.

### 3. Finalize — bind and move (mechanical)

Once integration is confirmed:

1. **Bind the ids** — `ariadne mint <LENS>` (without `--tmp`) for each draft; this allocates the real id and advances the state. The lens is the temporary id's prefix.
2. **Substitute every resolved temporary id project-wide.** A temporary id is globally unique, so replace every occurrence of that exact id with its bound id across the *whole* project — the promoted drafts' bodies and filenames, references in already-promoted specs and the domain model, **and references in any other drafts that remain unpromoted**. This is what keeps a draft that references a promoted story (but is not promoted in the same batch) pointing at the resolved id rather than a dangling temporary one. Do not limit the replace to the drafts being promoted together.
3. **Move** each draft into its place in the spec tree per the layout; merge an entity draft into the domain model as a section rather than a standalone file.
4. **Apply** the confirmed edits to affected existing specs (new relations, supersession notes).

### 4. Report

Summarize what was promoted (temp id → bound id), the relations added, and any existing specs changed.
Leave committing to the user, and remind them the state file advanced so it is committed alongside the promoted specs.
