---
name: clew-promote
description: "Promote reviewed draft stories and specs into the approved spec corpus — reason about how they fit the existing specs (relations, supersession, conflicts), reconcile, then finalize them with bound ids in the spec tree. Use when the user approves drafts and wants to 'promote', 'approve', or 'finalize' a story and its specs. Authoring is clew-draft; corpus analysis is clew-context."
---

# clew-promote

Promote reviewed drafts into the approved spec corpus.
Promotion is two things, and the first is the important one: **integrate** the new story and specs into the existing body of specs, then **finalize** them with bound ids in the spec tree.
Do not treat this as a file move — a new story can change what existing specs mean.

## What a lens is

A **lens** is a kind of spec — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), and so on.
A project declares its lenses in `.clewrc.json`, each with an `id` and a one-line `description`; the `id` is also the prefix of the ids minted for that kind (lens `SW` → `SW-001`, `SW-002`, …).

## When to use

- The user has reviewed drafts (see the `clew-draft` skill) and approves promoting them.
- The user asks to promote, approve, or finalize a story and its specs.

## What you must not do

- Do not run `clew promote` (it binds ids and moves files) until the integration below is settled — integration may reveal a draft should change or not be promoted, and temporary ids let that happen without burning real numbers.
- Do not silently rewrite, retire, or delete existing specs. Surface every proposed change and confirm it with the user.
- Do not commit. Leave commits to the user, and tell them the state file advanced.

## Procedure

### 1. Gather the drafts

Collect the drafts to promote — the pending drafts in the configured drafts location, or the specific ones the user named.
Read the project's configuration for the layout (where stories and specs live) and the lenses, so you know where each draft belongs and which prefixes are valid.

### 2. Integrate — reconcile with the corpus (the part only an agent can do)

First, make sure the corpus context exists.
If it was already built while drafting (the `clew-context` skill), reuse it; if not, build it now with `clew-context`.
It maps what the new story and specs relate to, what they may supersede or make obsolete, what they may conflict with, and whether any draft merely duplicates an existing spec.

Then act on that context: present the proposed relations and the supersession, conflict, and duplication candidates, with the edits they imply — to the drafts and to any affected existing specs — and get the user's confirmation.
Do not retire or change an existing spec silently, and do not promote a contradiction or a duplicate into the corpus.
This reconciliation is the point of promotion.

### 3. Finalize — run `clew promote` (mechanical)

Once integration is confirmed, run `clew promote <story…>` to finalize; name the story (or stories) to promote — or `all`. It does the mechanical work deterministically, so you do not bind ids, substitute, or move files by hand:

- it **resolves the set** as the named roots plus the closure of their temporary references — a story carries its specs through its references — and **refuses** if a reference points to a draft not in the set, so a promotion is never partial;
- it **binds** a real id for each draft in the set by minting the draft's lens — the temporary id's prefix — advancing the state;
- it **substitutes** each resolved temporary id within the drafts location — the promoted drafts and any other still-unpromoted draft that references them — so a draft that referenced a promoted one points at the bound id; the already-promoted spec tree is never rewritten;
- it **moves** each draft into its place in the spec tree per the layout, renamed to its bound id.

Invoke it for the story you confirmed: `clew promote <story|spec…>` finalizes those roots and their reference closure, or `clew promote all` finalizes every pending draft. A story must reference its draft specs, or they are not reached. It reports each temporary-id → bound-id mapping.

One thing it does not do, which stays with you after it runs:

**Apply** the confirmed integration edits to affected existing specs (new relations, supersession notes) — that is judgment, not mechanics. An entity draft carries no special case: with an entity lens configured, it promotes through the ordinary spec path like any other lens.

### 4. Report

Summarize what was promoted (temp id → bound id), the relations added, and any existing specs changed.
Leave committing to the user, and remind them the state file advanced so it is committed alongside the promoted specs.

## Done when

- The integration is reconciled with the user: relations, supersession, conflict, and duplication candidates presented and confirmed; no existing spec changed silently.
- `clew promote` has finalized the confirmed story and its reference closure — each temporary id bound and reported (temp → bound), references substituted within the drafts, files moved into the spec tree.
- The confirmed integration edits to existing specs are applied.
- The user is reminded that the state file advanced and that committing is theirs.
