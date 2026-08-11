# Quickstart

clew's workflow is driven by an **AI coding agent** equipped with clew's skills.
You direct the agent in plain language; the skills do the mechanical work — minting ids, writing drafts, binding them, placing anchors — through the CLI underneath.
You review, and coverage gives you the assurance view.
This is the loop end to end.

It assumes clew is [installed](installation.md).
New to the terms *anchor*, *traceable*, or *coverage*?
Skim [What is CAS-DD?](../concepts/what-is-cas-dd.md) first — this page moves fast.

## 1. Scaffold the project

Setting clew up is the agent's first job. With clew [installed](installation.md), tell your agent to bootstrap it — paste this:

> Set up clew (`@ariadne-thread/clew`) here. Run `clew setup --type <your agent> --generator typescript` (for example `--type claude`) — then start a fresh session (or read the just-installed files directly) so you pick up the skills and governance.

The agent supplies only its own name; clew knows where each agent reads its skills and governance and fills the rest (`claude` is the default, so `--type` is optional there). A different agent passes its own `--skills-dir` / `--governance-dir` / `--entry-file` — see the [command reference](../reference/commands.md). This writes `.clewrc.json` (your lenses and layout), the spec-tree layout, and **emits clew's skills and governance into your agent's locations** so it knows how to set up, draft, promote, implement, and anchor.

Skills and governance load at an agent's **session start**, so a fresh session is what makes clew ambiently available after setup. The generated-traceables folder appears later, when `clew spec` first runs, not at setup. Inspect the resolved configuration any time with `clew config`.

Before you go on, read the **governance** the scaffold emitted — the charter, and the architecture, coding, testing, and spec conventions in your governance directory (`clew config` shows it; the default is `.claude/.ai-project-context/`) — and adjust it to your project.
It is the contract your agent works under, so shape it first; everything it does afterwards is bound by it.

## 2. Set up the project

The command scaffolded the configuration and the skills; this step establishes what the project *is*. Ask your agent:

> "Set up the project."

The agent runs the **setup** skill. On a new project it interviews you; on an existing one it derives the answers from your build files, code, and docs, with your go-ahead. Either way it fills two documents and stops for review:

- the **technology contract** (`004-technology-contract.md`) — the runtime and core libraries you build on;
- the **architecture overview** (`docs/spec/architecture.md`) — the style, the modules and their responsibilities, and the dependency directions.

For a new project it then drafts a **workspace-setup story** whose steps stand the workspace up to that architecture. It writes nothing else — no installs, no builds — so you review the two documents and the story, promote the story, and have the agent carry it out.

> **Adopting clew into an existing project?** The setup skill derives your `004` and architecture from the build files, code, and docs instead of interviewing — and drafts a workspace-setup story *only if* it judges the workspace does not yet match that frame. Often it needs none: you get the documented frame and go straight to authoring specs for the code that already exists. See [Adopting clew in an existing codebase](adopting-an-existing-codebase.md) for how to bring clew to code you already have — seed the load-bearing decisions, and anchor at the change edge.

This is the frame every later story is written against: the architecture's enforceable rules become `ARCH` and `CON` specs as the code they constrain is built.

## The loop

Steps 3–6 are the loop you repeat to evolve the project — **draft → promote → implement and anchor → check coverage**, one increment per turn.

Where you enter the loop depends on setup: **if it created a workspace-setup story, skip step 3 and start at step 4** — promote that story, then implement it (step 5) to stand the workspace up. If it created none — an existing project already in line, or the architecture left out — start at step 3 as written. From your next increment on, you always begin at step 3.

## 3. Draft a story and its specs

Ask your agent, in plain language:

> "Draft a story for submitting an order."

The agent runs the **draft** skill: it drafts the story with a *temporary* id, then runs the **context** skill to map the surrounding corpus — what the story relates to, may supersede, or must fit — and writes the specs the story needs grounded in that, before stopping for your review.
Review the drafts and refine them with the agent until they say what you mean.

## 4. Promote into the corpus

When the drafts are right:

> "Promote them."

The agent runs the **promote** skill: it reconciles the drafts with the existing specs, binds a real id to each (`SW-TMP-…` → `SW-001`), and moves them into the spec tree.
Promotion is atomic — a story carries its specs with it.

## 5. Implement and anchor

> "Implement SW-001 and anchor it."

The agent runs the **implement** skill: it activates the spec, regenerates the traceables, and — writing the code the way your project works, following whatever implementation and testing skills it has — adds the code with a `realizes` anchor and a test with a `verifies` anchor (delegating the marker placement to the **anchor** skill):

```ts
import { realizes, SwTraceables } from "../clew/traceables";

export const submitOrder = realizes(SwTraceables.SW_001_SUBMIT_ORDER, (order: Order) => {
  if (order.lines.length === 0) throw new OrderRejected();
  // …
});
```

Because the anchor references a generated symbol, `tsc` now holds the code to the spec: delete `SW-001`, regenerate, and this line stops compiling.
(Under NodeNext module resolution, import the traceables from `../clew/traceables/index.js`.)

As its closing move the implement skill runs coverage and confirms `SW-001` now reports **covered** — the increment closes only once it does — then runs `clew-review` over the spec to confirm the code and test genuinely honor it, not merely that the link exists.

## 6. See coverage

Read the anchors back the other way. The implement skill already confirmed `SW-001`; this is the same view over the whole corpus, which you or CI run directly:

```bash
clew coverage
clew check
```

`SW-001` shows as **covered** — realized and verified.
`clew check` confirms the corpus's integrity (no anchor names a missing spec, no spec id hides in a comment).

## What you have

A specification the compiler holds your code to, a test bound to the same id, and coverage that reports both — assembled as the work was done, not audited after.
The agent drove the loop through the skills; you directed and reviewed.

Next: the [skill reference](../reference/skills.md) — the skills that drove the loop — and the [command reference](../reference/commands.md).
