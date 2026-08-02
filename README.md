# clew

A **clew** is an old word for a ball of thread.

In the Greek myth of Theseus and the Minotaur, Ariadne gives Theseus such a thread before he enters the labyrinth.
It is not the weapon that helps him defeat the Minotaur.
It is what lets him find his way back afterwards.

Software has its own labyrinths: not only code, but decisions; not only decisions, but the fading reasons behind them.

**Spec-driven development** answers this by writing the intent down first — as specifications — and building to it.
clew is built on the conviction that a specification governing software should remain traceable to the code that realizes it — and the code back to the intent it serves.

So clew runs a real thread between the two: each spec is tied to the code that realizes it, and each piece of code back to the intent it serves — weaving the two layers into one fabric you can follow in either direction.

*Which code answers to this spec? Which decision does this line serve?*

**Follow the thread** to the answer.

clew is the open-source CLI for **Code-Anchored Spec-Driven Development — CAS-DD**, a method set out in full in [this article](https://ariadne-thread.io/blog/code-anchored-spec-driven-development.html).

```bash
npm install -g @ariadne-thread/clew
```

It works with **TypeScript** and **Java** today; language support is generator-based, so more can be added.

> **Built with Claude, open to other agents.**
> clew is developed and tested with [Claude Code](https://claude.com/claude-code).
> Its skills are authored in the open [Agent Skills](https://agentskills.io) (`SKILL.md`) format that many agents read, and it wires its governance into each agent's own instructions file.
> It also ships integration for **Gemini, Cursor, Zed, Amp, Codex, and Copilot**, built to their documented conventions but **not yet tested by us** — if you run clew under another agent, feedback is explicitly welcome.

## How clew holds the thread

clew turns each active specification into a generated, language-native symbol: a **Traceable**.

Code uses that symbol to declare how it relates to the specification:

* `realizes` — production code implements the specified behaviour;
* `verifies` — a test checks the specified behaviour;
* `concerns` — code is coupled to the specification without implementing it directly.

```ts
import {
  realizes,
  verifies,
  SwTraceables,
} from "../clew/traceables";

export const submitOrder = realizes(
  SwTraceables.SW_014_SUBMIT_ORDER,
  (order: Order) => {
    // implementation
  },
);

verifies(SwTraceables.SW_014_SUBMIT_ORDER, () => {
  test("submits a valid order", () => {
    // verification
  });
});
```

The `../clew/traceables` folder is generated in your project by `clew spec`; its path is the `outputDir` you configure (the TypeScript default is `src/clew/traceables`).

These are not references written as comments or arbitrary strings.
They are generated symbols that the compiler can see.

A typo does not compile.
If a specification is removed and its Traceable disappears, every remaining anchor to it fails at typecheck.

The thread cannot quietly point to something that no longer exists.

## Follow it in both directions

The anchors let you move from code to intent:

> *Which specification governs this function?*

clew also scans those anchors in reverse, so you can move from intent back to code:

> *Where is this specification implemented? Where is it tested?*

```bash
clew coverage
```

```text
Coverage: 100 covered, 10 realized, 0 verified, 0 none (110 specs).

Waived (10):
  STK-001  realized — stakeholder needs are verified by acceptance, not by an automated test
  SYS-001  realized — compile-checked anchoring is enforced by tsc, not by a unit test
  …

Deprecated (1):
  SW-005
```

For every active specification, clew reports the relationship the codebase declares.
As a project is built, specs that no code has claimed yet appear under an `Open gaps (N)` section, so nothing is quietly missing.

| State          | Meaning                                                            |
| -------------- | ------------------------------------------------------------------ |
| **Covered**    | Production code realizes the spec and a test verifies it           |
| **Realized**   | An implementation anchor exists, but no verification anchor        |
| **Verified**   | A verification anchor exists, but no implementation anchor         |
| **None**       | No code or test has claimed the spec — an open gap                 |
| **Waived**     | A gap deliberately excused, with a recorded reason                 |
| **Deprecated** | The specification is retiring and reported outside active coverage |

Coverage does not prove that an implementation is correct or that a test is meaningful.

It proves something narrower: the declared relationship points to a live specification, and missing relationships are visible.

The compiler keeps the pointer valid.
Review determines whether the claim is sound.

## The CAS-DD loop

clew supports the working loop of **Code-Anchored Spec-Driven Development**.

### 1. Draft

Describe the next increment as a story and derive the specifications it needs.

Specifications begin as drafts with temporary ids.
Drafting is deliberately cheap and reversible: no permanent ids are consumed, and no shared corpus is changed until the decisions are ready.

### 2. Promote

Review the drafts, assign stable ids, and move them into the specification corpus.

Promotion is the point at which a draft becomes a decision that other specifications and code may refer to.

### 3. Implement and anchor

Generate the Traceables, write the code, and anchor implementation and tests to the specifications they serve.

A specification becomes `active` when implementation begins.
Its generated Traceable can then be used directly while the code is being written.

### 4. Check coverage

Scan the anchors in reverse and account for every open gap.

A specification is covered when production code claims to realize it and a test claims to verify it.

Then the next increment begins from the anchors already present in the code.

The specification corpus grows with the system, and each change revisits the intent of the code it touches.

## Start from where you are

Adopting clew does not ask you to have anything in place first.

No existing documentation system.
No ADRs, no requirements-management tool.
No architecture worked out in advance.

clew does not hand you an architecture.
It walks you through deriving a plain, standard one — and leaves room for a dedicated approach where your project calls for it.
`clew setup` scaffolds the configuration and installs the skills; from there the setup skill reads your existing build files, code, and docs and works out a baseline technology contract and architecture overview together with you.
It is a starting frame you own and adapt, not a finished design handed down.

Its skills fit into how you already work.
Where your setup already has skills for drafting, implementing, or testing, clew's skills delegate to them rather than replace them.

Nor do you specify your whole system before you begin.
Coverage runs from specification to code, so code you have not yet specified is not a backlog of gaps — it is simply out of view.
You can anchor a single behaviour, leave the rest of the codebase untouched, and let the corpus grow story by story.

The one thing clew does need is a generator for your language.
TypeScript and Java ship today; language support is generator-based, so more can be added.

Understanding the method takes some study; that is expected of any real method.
What it does not take is reshaping your project to fit it before you can start.

## Small specifications, precise anchors

CAS-DD does not treat the specification corpus as one large document.

It decomposes intent into small, stable, individually addressable units:

* stakeholder needs;
* system capabilities;
* software behaviours;
* architectural decisions;
* constraints;
* non-functional qualities.

Each specification captures one decision that can be implemented, tested, reviewed, or deliberately accounted for.

From clew's own corpus:

```text
STK-004  Traceability lives with the code
SYS-002  Reverse traceability, reported as coverage
SW-016   Promote a story into the spec tree
ARCH-003 Generators are reached through one interface
CON-002  A sequence number is never reused
NF-002   State writes are atomic
```

The anchor belongs at the altitude where the decision lives.

A software behaviour may be anchored at a function.
A system capability may be anchored at a module boundary.
An architectural decision may concern several components without being implemented by one of them alone.

The unit of anchoring is the unit of intent.

## Built for agentic development

Specifications give coding agents written intent.

Anchors make that intent locally recoverable.

Without an explicit connection, an agent opening a function must search the wider specification corpus and infer which decisions apply.
The relevant context may exist, but its relationship to the code has to be reconstructed on every edit.

With clew, the code already names the specifications it claims to answer to.

From an edit site, an agent can follow the anchors to the relevant behaviours, constraints, and architectural decisions.
It can then find the other implementation and test sites attached to the same intent.

Because an anchor is a generated symbol, the type checker also makes the spec–code link a **first-class sensor** in Birgitta Böckeler's sense for an [agent harness](https://martinfowler.com/articles/harness-engineering.html): a *computational* sensor — deterministic and fast — that fires the moment the declared link goes stale.
A coding agent gets that feedback on every build and can self-correct before a human reviews; the same signal guards the corpus for everyone else.

The same thread helps human reviewers.
A diff shows not only what changed, but which specification the change claims to serve.

clew includes agent-facing skills for the steps of the CAS-DD loop.
They are installed through:

```bash
clew setup
```

The skills help an agent:

* build context from the anchors already present in the code;
* draft stories and specifications;
* promote reviewed drafts;
* implement and anchor changes;
* check coverage and identify unexplained gaps.

You direct and review the work.
The skills operate the method and keep its structure in place.

## A governance contract

Traceability alone does not tell an agent how a project should be changed.

clew therefore ships a project governance contract — installed by `clew setup` — and loads it as context alongside your specifications and design documents.

It arrives as a standard baseline: not a blank form to fill, and not a finished rulebook to obey.

* architectural boundaries;
* coding conventions;
* testing conventions;
* specification conventions;
* repository-specific constraints;
* the conditions under which work is considered complete.

You adapt it to how your project actually works — keeping the baseline where it fits, taking your own approach where it does not — rather than authoring it from scratch before you start.

The specifications describe what the system is meant to do.

The governance contract describes how work on that system must be carried out.

## What clew guarantees — and what it does not

An anchor is a checked claim.

It proves that the code refers to a real, active or deprecated specification.
It makes stale references visible when specifications are removed or changed.
The reverse scan makes missing declared relationships visible.

It does not prove that:

* the specification captures the right decision;
* the implementation correctly realizes the specification;
* the test meaningfully verifies it;
* the anchor has been placed on the right code.

A test can claim to verify a specification and assert nothing useful.
Production code can claim to realize a behaviour while implementing only part of it.

So **covered** does not mean **correct**.

The mechanism protects the structure of the relationship.
Human review still judges the work at both ends.

The thread makes divergence easier to see.
It does not make divergence impossible.

## clew follows its own thread

clew is built using CAS-DD.

Its own specifications are anchored into its own production code and tests.
Its stories and specifications are committed alongside the implementation they shaped.

The repository is therefore both the source of the tool and a living example of the method.

Read a specification.
Follow its Traceable into the code.
Find the tests attached to it.
Run coverage.

Judge the approach from the system that implements it.

## Start here

Install clew:

```bash
npm install -g @ariadne-thread/clew
```

Then set it up **from inside your coding agent** — paste this and let the agent run it:

> Set up clew (`@ariadne-thread/clew`) in this repository. Run `clew setup --type <your agent>` — for example `--type claude`, `--type cursor` — then **either start a fresh session** so you pick up the installed skills and governance, **or** read the just-installed files directly and continue right away.

The agent supplies only its **own name**; clew knows where each agent reads its skills and governance and fills the rest. Known agents: **claude** (the default, so `--type` is optional), **gemini**, **cursor**, **zed**, **amp**, **codex**, **copilot**. A different agent instead passes its own `--skills-dir` / `--governance-dir` / `--entry-file`. Add `--generator typescript` (or `java`) to wire the Traceables generator.

**Skills and governance load at an agent's session start** — so once `clew setup` has written them, a **fresh session** is what makes the method ambiently available (the agent can also read the just-installed files directly to continue immediately). From there the `clew-setup` skill establishes your stack and architecture with you.

Then continue with:

* [Quickstart](docs/guide/getting-started/quickstart.md) — from an empty project to checked coverage
* [Installation](docs/guide/getting-started/installation.md)
* [What is CAS-DD?](docs/guide/concepts/what-is-cas-dd.md)
* [The specification lifecycle](docs/guide/concepts/spec-lifecycle.md)
* [Command reference](docs/guide/reference/commands.md)
* [Full guide](docs/guide/index.md)

The README is the entrance.
The guide carries the detail.

## Current scope

clew is an open-source, local, repository-native Node CLI.

It currently supports:

* TypeScript;
* Java;
* generated, language-native Traceables;
* `realizes`, `verifies`, and `concerns` anchors;
* reverse coverage scanning;
* specification lifecycle management;
* agent-facing workflow skills;
* project governance conventions.

Language support is generator-based.

Each supported language provides both:

1. generation of Traceables in the language's native syntax;
2. recognition of that language's anchors during the reverse scan.

## Development

The clew source is on GitHub:

https://github.com/ariadne-systems/clew

```bash
git clone https://github.com/ariadne-systems/clew.git
cd clew
pnpm install
```

The repository is a pnpm workspace:

| Package          | Name                    | Role                                                                     |
| ---------------- | ----------------------- | ------------------------------------------------------------------------ |
| `packages/clew`  | `@ariadne-thread/clew`  | The language-neutral engine, language generators, and CLI                |
| `packages/trace` | `@ariadne-thread/trace` | The Traceables and anchoring utilities generated and used by clew itself |

The engine reaches each language generator through a narrow interface.
The concrete generators are bound at a single registry point.

### Toolchain

TypeScript using ESM and NodeNext, with:

* tsdown for builds;
* tsx for development;
* Vitest for tests;
* Biome for linting and formatting;
* Changesets for versioning;
* publint and are-the-types-wrong for package validation;
* lefthook for Git hooks.

Node 22 LTS is the supported floor.

### Commands

| Command              | Purpose                                   |
| -------------------- | ----------------------------------------- |
| `pnpm build`         | Build all packages with tsdown            |
| `pnpm typecheck`     | Run `tsc --noEmit` across the workspace   |
| `pnpm test`          | Run the Vitest test suite                 |
| `pnpm lint`          | Check the code with Biome                 |
| `pnpm format`        | Format the code with Biome                |
| `pnpm check:pkg`     | Validate the publishable packages         |
| `pnpm dev <command>` | Run the CLI directly from source with tsx |

`pnpm build` runs before `pnpm typecheck`, `pnpm test`, and `pnpm check:pkg`, because workspace packages resolve one another through their built output.

## Contributing

clew is open for **use and feedback**, but not yet for external code contributions.
Bug reports and feedback — especially on running clew under agents other than Claude Code — are welcome via [issues](https://github.com/ariadne-systems/clew/issues); see [CONTRIBUTING.md](CONTRIBUTING.md).
For security reports, see [SECURITY.md](SECURITY.md).

## License

See [LICENSE.md](LICENSE.md).

---

A codebase is a labyrinth of decisions.

**Follow the thread.**
