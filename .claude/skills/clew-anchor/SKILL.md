---
name: clew-anchor
description: Anchor code to the specs it realizes, verifies, or concerns, using the generated trace markers, so the spec-to-code link is checked by the build instead of left in a comment. Use after writing or changing code, a test, or a type that implements, exercises, or is coupled to a spec. Resolves the traceables folder from the project configuration and follows the generator's own documentation for the target language.
---

# clew-anchor

When you change code that implements a spec, tests it, or is coupled to it, bind the code to the spec with the generated trace markers, so the link is enforced by the target language's tooling instead of asserted in a comment that rots (ADR-0001, ADR-0004).

This skill adds markers for spec ids that **already exist**.
It does not author or promote specs — that is `clew-draft` and `clew-promote` — and it never invents an id.

The relations are language-neutral; the exact marker syntax is the generator's, one per target language. So this skill resolves *where* and *how* from the project, never from a fixed assumption.

## When to use

- You implemented a behaviour a spec describes → add a **realizes** anchor.
- You wrote a test that exercises a spec → add a **verifies** anchor.
- You wrote code coupled to a spec it does not implement or test — and the coupling is not already a call into the realizing code → add a **concerns** anchor.

Skip a relation the code does not actually hold; do not anchor for the sake of anchoring.

## 1. Resolve the traceables folder from configuration

The markers live in a generated folder whose location is the project's choice, and each target language has its own folder — so read it, never assume a path.

- Read `.ariadnerc.json` → `generators`. Each entry has a `type` (the target language) and an `outputDir`. Take the entry for the language you are editing.
- That entry's `outputDir` is that language's traceables folder; if it has no `outputDir`, the generator's own default applies. Different generators write to different folders.
- The folder holds the generated verifiable symbols for that language (which name the available spec ids) and, where the language supports it, a helper or utility the generator emits.

## 2. Read what the generator emitted, before anchoring

Open the generated folder for your language and read the documentation the generator emits there — typically a `README.md` (and per-symbol documentation in the generated source).
It describes the generator's own markers: the relations it supports and the exact form for each in that language (a function call, a decorator or annotation, a type construct, and so on), the single-id versus list form, and which kind of element each form applies to.
Follow that documentation; it is the source of truth for the API in that language. Do not carry a form over from another language.

Resolve how code references a symbol the way the codebase already does: find an existing anchor in that language and reuse its mechanism — the reference (import, include, or qualified name) and the marker form. The folder may be its own package or a path inside the project; match what is already used.

## 3. Make sure the id exists

A marker references a generated symbol, which exists only after the spec has been generated.

- If the id you need is missing from the generated symbols, its spec has not been generated yet: a spec must be promoted (bound id) and the generator run before its symbol exists.
- Regenerate with the project's spec command. Resolve how the CLI runs — `clew` on PATH, the package manager's local binary (for example `pnpm exec clew` or `npx clew`), or the repository's dev runner (for example `pnpm dev spec`) — and confirm with `clew --help`. Never assume a global binary.
- Reference only symbols that exist; do not invent an id.

## 4. Choose the relation, then the form the generator documents

Three relations, the same in every language (ADR-0004):

- **realizes** — the code is the spec's implementation.
- **verifies** — a test exercises the spec.
- **concerns** — the code is coupled to the spec without realizing or verifying it. Add this **only** when the coupling is not already a call into the realizing code; a coupling on the call path is recovered from the call graph and needs no marker.

Apply the chosen relation with the form the generator's documentation gives for your target language and for the kind of element you are anchoring — a value, a function, a class, a method, a test, a type, or an interface.
Anchoring to more than one spec uses the list form that documentation describes.

## 5. Apply, then stop

- Reference the generated symbol(s) and add the marker, using the language's documented form.
- Keep the code valid for the language's compiler or checker (for example, preserve explicit type annotations where the language requires them).
- Do not also write the spec id in a comment — the marker is the link, and a comment would only rot.
- Verify with the language's type-checker or build: a wrong or removed id will not pass. Do not commit.

## What you must not do

- Do not invent ids, or reference symbols that the generator did not emit.
- Do not anchor a relation the code does not hold, and do not add `concerns` for a coupling that is already a call.
- Do not assume a marker form from one language applies to another; read the generator's documentation.
- Do not author or promote specs here, and do not hand-edit the generated folder.
- Do not commit.
