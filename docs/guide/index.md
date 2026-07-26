# clew documentation

Every codebase is a labyrinth, and finding your way through it means being able to **follow the intent** behind the code — what each part is meant to do, the decision it answers to, the rule it must not break.
That intent is the thread through the maze.
But usually there is no thread to follow: it lives in people's heads, in a wiki nobody kept up, in comments that stopped being true three refactors ago — and recovering what a piece of code was *supposed* to do turns into archaeology.

**Spec-driven development** answers this by writing the intent down first — as **specifications** — and building to it.
clew's conviction is that a spec is only worth writing if you can get from it to the code that fulfils it, and back.
So clew runs a real thread between the two — each spec tied to the code that realizes it, each piece of code tied to the intent it serves — weaving the two layers into one fabric you can follow in either direction.
*Which code answers to this spec? Which decision does this line serve?*
You follow the thread to the answer.

clew is agent-based: an AI coding agent draws these threads as it works — drafting specs, tying code to them — while you direct and review.
And because each tie is anchored where the compiler can see it, the thread stays real as the code changes.

## A thread through the code

A **clew** is a ball of thread — the one Ariadne gives Theseus so he can **follow it back out** of the labyrinth.
The tool is named for it and does the same job: it runs a thread between your specs and your code, walkable in either direction — from a spec to the code that realizes it, from a line of code back to the intent it serves — anchored where the compiler can see it, so it stays real as the code moves.

A system is not one large specification but **many small specs**, each pinning a single decision.
It grows **story by story** — each story an increment that adds or changes a few specs and the code that realizes them, woven into the **corpus** of specs already there rather than bolted on.

And weaving is not only *adding* threads.
When a story touches code that already carries anchors, the agent follows them back to the specs behind that code, reads the intent, and keeps the two in step — revising a neighbouring spec the change has outgrown, and recording why.
The corpus stays current wherever the work reaches, instead of aging into a snapshot that quietly stops describing the code.

## How it works

Every `active` spec generates a typed symbol.
Code references that symbol with one of three relations — `realizes`, `verifies`, or `concerns` — and the language's own type checker enforces it: name a spec that no longer exists and the code stops compiling.
Read the anchors the other way and you get coverage, so "is this spec implemented and tested?" is answered by the toolchain, not by an audit.
An anchor is a *claim*, not a proof of correctness — but a claim the build keeps honest.

## The agent and the CLI

clew is **agent-based**.
You work with an AI coding agent, and the judgment work is the agent's, driven by clew's skills: drafting a story (an increment of work), reasoning about how its new specs fit the existing corpus, and writing the code.

Underneath, the agent delegates the **deterministic** work to the `clew` CLI: the operations that must be reproducible and identical every time — minting ids, generating the traceables, promoting drafts atomically into the corpus, running the integrity checks.
Judgment stays with the agent; mechanics stay with the CLI.

The CLI also **owns the persisted state**, and the ids are the heart of it.
An id is the **permanent name of a unit of intent** — the spec file, the generated traceable (`SW_014_…`), and every code anchor that names it all share that one id.
It is the join that holds the three together: rename the spec's title or move the code, and the anchor still points home, because it binds to the id, not the text.

That stability is only worth anything if the id is unique and durable, so `clew` hands out each id from a version-controlled state file — gap-free and **never reused**.
Reuse a number and every old anchor would silently point at the wrong intent; let two branches guess the next one and they collide.
Allocation is the CLI's job, not the agent's or a human's, because the id is what the compiler-enforced link ultimately hangs on.

Setting this up is one step — `clew setup` scaffolds the configuration and emits clew's skills into your agent.
From then on you direct the agent in plain language and review its work; see the [Quickstart](getting-started/quickstart.md).

## Where to go next

- **New here?** Read [What is CAS-DD?](concepts/what-is-cas-dd.md) and [The spec lifecycle](concepts/spec-lifecycle.md) — the model in a few minutes.
- **Want to try it now?** Jump to the [Quickstart](getting-started/quickstart.md) — an empty project to checked coverage.
- **Installing?** See [Installation](getting-started/installation.md).
- **Working through the agent?** See the [Skill reference](reference/skills.md) — the skills that drive the loop.
- **Looking up a command?** See the [Command reference](reference/commands.md).
- **Configuring the project?** See the [Configuration reference](reference/configuration.md) — every section of `.clewrc.json`.
