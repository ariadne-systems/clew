---
name: clew-setup
description: "Set up a project for clew — establish .ariadnerc.json, help the user choose the project's lenses (spec kinds) and layout, and orient them toward their first ids. Use when starting clew in a project, when a command reports no configuration (error[E_NO_CONFIG]), or when the user asks to 'set up', 'initialize', or 'configure' clew. Not spec authoring (see clew-draft)."
---

# clew-setup

Guide a user through setting up clew in their project: establish the configuration, choose the project's lenses and layout deliberately, and orient them toward their first ids.

The mechanical write is done by the `clew setup` command; this skill is the interactive layer around it — explaining the choices, helping the user customize, and handling the greenfield-versus-adoption split.
Do not hand-write what the command scaffolds.

## When to use

- The user is starting clew in a new or existing project.
- A command failed with `error[E_NO_CONFIG]` (the tool says to run `clew setup`).
- The user asks to set up, initialize, or configure clew, or to change the lenses or layout.

## What you must not do

- Do not author spec content or per-lens derivation guidance — that is the companion `clew-draft` skill's job. This skill only establishes the configuration and orients.
- Do not regenerate or overwrite an existing configuration. If the user wants changes, edit `.ariadnerc.json`; do not recreate it.
- Do not commit. Leave commits to the user, and remind them what to commit.

## Procedure

### 1. Read the situation

Check whether `.ariadnerc.json` already exists, and whether the project already has spec artifacts (for example an existing `docs/spec` tree or other id-bearing files).

- Configuration present → report it; only adjust on request (step 4).
- No configuration, no artifacts → greenfield (step 2, then 3a).
- No configuration, but existing artifacts → adoption (step 2, then 3b).

### 2. Choose the lenses — the deliberate moment

Explain that lenses are the project's spec kinds — the prefixes it mints (the defaults are `STK`, `SYS`, `SW`, `ARCH`, `NF`, `CON`), each a viewpoint that specs are derived through.

Ask whether the default set fits, or whether the project should rename, add, or remove lenses.
This is the choice the setup step exists to surface, made before the first id is minted — once ids are allocated under a lens, that lens is part of the project's permanent vocabulary.

Keep the guidance to the project's own domain; do not impose another project's taxonomy.
For example, a safety- or compliance-driven project may want a dedicated verification lens, and a business-heavy project may want a business-rule lens — but only if the project actually produces those artifacts.

### 3. Scaffold

**3a. Greenfield.**
Run `clew setup`.
It writes `.ariadnerc.json` with the default lenses and layout and creates the layout directories.
If the user chose to customize, edit the `lenses` and `layout` sections of `.ariadnerc.json` to match — before any id is minted.

**3b. Adoption (existing artifacts).**
Run `clew setup` to write the configuration, then edit its `lenses` to match the prefixes the existing artifacts already use, and its `layout` to point at where those artifacts live.
Then run `clew init` to seed the state from the existing artifacts, so minting continues after the ids already in use rather than colliding with them.

### 4. Orient

Confirm what was created or found.
Point the user to their next step: `clew mint <LENS>` to allocate an id (for example `clew mint SW`), and the companion `clew-draft` skill to draft a story and its specs.
Remind them to commit `.ariadnerc.json` and the state file so the team shares the same configuration and id allocations.

## Notes

- The configured lenses are the single source of truth for which prefixes the tool will mint; an unconfigured prefix is rejected.
- A project with no configuration cannot mint or initialize — the commands direct the user here first — so setup is always the deliberate first step.

## Done when

- `.ariadnerc.json` exists with the project's chosen lenses and layout, and the layout directories are created.
- For an adopted project, the state is seeded (`clew init`) so minting continues past the ids already in use.
- The user knows their next step (`clew mint <LENS>`, then the `clew-draft` skill) and what to commit.
- No existing configuration was overwritten, and nothing is committed.
