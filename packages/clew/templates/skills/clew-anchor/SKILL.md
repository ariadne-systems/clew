---
name: clew-anchor
description: "Anchor code to the specs it realizes, verifies, or concerns, using the generated trace markers, so the spec-to-code link is checked by the build instead of left in a comment. Use after writing or changing code, a test, or a type that implements, exercises, or is coupled to a spec — e.g. 'anchor this', 'add trace markers', 'link this to its spec'. Resolves the traceables folder from the project configuration and follows the generator's own documentation for the target language. Does not author or promote specs (see clew-draft, clew-promote)."
---

# clew-anchor

When you change code that implements a spec, tests it, or is coupled to it, bind the code to the spec with the generated trace markers, so the link is enforced by the target language's tooling instead of asserted in a comment that rots.

This skill adds markers for spec ids that **already exist**.
It does not author or promote specs — that is `clew-draft` and `clew-promote` — and it never invents an id.

The relations are language-neutral; the exact marker syntax is the generator's, one per target language. So this skill resolves *where* and *how* from the project, never from a fixed assumption.

## When to use

- You implemented a behaviour a spec describes → add a **realizes** anchor.
- You wrote a test that exercises a spec → add a **verifies** anchor.
- You wrote code coupled to a spec it does not implement or test — and the coupling is not already a call into the realizing code → add a **concerns** anchor.

Skip a relation the code does not actually hold; do not anchor for the sake of anchoring.

## What you must not do

- Do not invent ids, or reference symbols that the generator did not emit.
- Do not anchor a relation the code does not hold, and do not add `concerns` for a coupling that is already a call.
- Do not assume a marker form from one language applies to another; read the generator's documentation.
- Do not author or promote specs here, and do not hand-edit the generated folder.
- Do not guess past a missing or ambiguous precondition — no config, no generator for the language, an ambiguous generator choice, a missing generated folder or documentation, or an unclear target spec id. Stop, change nothing, and report the specific missing precondition.
- Do not commit.

## Procedure

### 1. Resolve the traceables folder from configuration

The markers live in a generated folder whose location is the project's choice, and each target language has its own folder — so read it, never assume a path.

- Run `clew config` (or `clew config --json`) and read the **resolved** `generators`: each entry has a `type` (the target language) and a resolved `outputDir` — the configured path, or the generator's own default when `.clewrc.json` omits it. Take the entry for the language you are editing; its `outputDir` is that language's traceables folder. Read the *resolved* config, not raw `.clewrc.json`, so the folder always resolves even when no `outputDir` is set — different generators write to different folders.
- The folder holds the generated verifiable symbols for that language (which name the available spec ids) and, where the language supports it, a helper or utility the generator emits.

### 2. Read what the generator emitted, before anchoring

Open the generated folder for your language and read the documentation the generator emits there — typically a `README.md` (and per-symbol documentation in the generated source).
It describes the generator's own markers: the relations it supports and the exact form for each in that language (a function call, a decorator or annotation, a type construct, and so on), the single-id versus list form, and which kind of element each form applies to.
Follow that documentation; it is the source of truth for the API in that language. Do not carry a form over from another language.

Resolve how code references a symbol the way the codebase already does: find an existing anchor in that language and reuse its mechanism — the reference (import, include, or qualified name) and the marker form. The folder may be its own package or a path inside the project; match what is already used.

### 3. Make sure the id exists

A marker references a generated symbol, which exists only after the spec is promoted (bound id) and generated — an `active` or `deprecated` spec has one; a `planned` spec does not.

- If the id is present in the bound spec sources and `active` but its symbol is absent, the generated output is stale: regenerate with the project's spec command (`clew spec`) and check again.
- If the id is not bound, or the spec is still `planned`, stop without editing code and report that anchoring requires promotion (or activation) first — this skill does not promote or change status.
- If the spec is `deprecated`, its symbol exists, but do not add a new `realizes` or `verifies` anchor to it (a `concerns` coupling is still fine); stop and report so a live spec can be used instead. The build will not catch this — the marker compiles — so it is yours to catch.
- Reference only symbols that exist; do not invent an id.

### 4. Choose the relation, then the form the generator documents

Three relations, the same in every language:

- **realizes** — the code is the spec's implementation.
- **verifies** — a test exercises the spec. The test must be able to *fail* if the spec were violated; a test that cannot fail is a hollow verification, and a `verifies` anchor on it claims a check that is not there. The build compiles the marker either way — so this one is yours to catch.
- **concerns** — the code is coupled to the spec without realizing or verifying it. Add this **only** when the coupling is not already a call into the realizing code; a coupling on the call path is recovered from the call graph and needs no marker.

A spec is **Covered** only when it carries **both** a `realizes` and a `verifies` anchor — for **every** lens, no exception. The lens sets the *altitude* of the two anchors, never whether both are needed: a high-altitude need or capability (a stakeholder or system spec) realizes on the top-level code that delivers it and verifies via an acceptance or system test; a component behaviour realizes on its service and verifies with a unit test. No lens is verify-only, realize-only, or waived by default — a genuine exception is a per-spec waiver, not a lens-wide rule.

Apply the chosen relation with the form the generator's documentation gives for your target language and for the kind of element you are anchoring — a value, a function, a class, a method, a test, a type, or an interface.
Anchoring to more than one spec uses the list form that documentation describes.

A spec is often realized — or verified — at **more than one** genuine site; anchor **every** one, not just enough to turn coverage green. Coverage reports `realized` after the first anchor, but stopping there leaves the other real sites unlinked: a reader misses them, and a later change to an un-anchored site never surfaces the spec. Anchor as many sites as genuinely hold the relation — no fewer (do not stop at the first), no more (do not anchor for the sake of it).

The exception is a **cross-cutting** spec: it has no single implementing line — a structural rule that governs a whole region (every module, every package), or a quality attribute realized by many parts at once. Anchor its `realizes` at the **most representative single site**: the region's own declaration for a whole-region rule (a package or module entry point), or the mechanism that makes the attribute achievable for a quality one (the port, factory, or seam it hinges on — for example the injectable clock a deterministic-timing spec depends on). Its `verifies` goes on the test that exercises the rule across the region (a structural-rule test, an end-to-end quality test). The single site is a deliberate, representative choice, not an arbitrary one; pick the site that most *is* the rule, and place the marker there consistently.

### 5. Apply, then stop

- Reference the generated symbol(s) and add the marker, using the language's documented form.
- Keep the code valid for the language's compiler or checker (for example, preserve explicit type annotations where the language requires them).
- Do not also write the spec id in a comment — the marker is the link, and a comment would only rot.
- Verify with the narrowest check that covers the change — a package script, a targeted test, or the module's type-check, not a full monorepo build: a wrong or removed id will not pass. Do not commit.

## Done when

- Each changed code element that holds a relation carries the correct marker (**realizes** / **verifies** / **concerns**), referencing a generated symbol that already exists.
- The marker form matches the generator's own documentation for that language; no id is invented, and no spec id is left in a comment.
- The language's type-checker or build passes, and nothing is committed.
