# Adopting clew in an existing codebase

The [Quickstart](quickstart.md) starts from an empty project.
Most codebases are not empty — and the way you bring clew to one you already have is the opposite of the first instinct.

## clew is not a spec generator

The instinct is to point clew at your codebase and have it produce a spec per module.
Do not.
A spec generated from code only restates the code — the *what* it already shows — and misses the *why*: the decision, the constraint, the rule it must not break.
Worse, reading code alone cannot tell a load-bearing decision from an incidental detail, so every generated "spec" arrives with equal, false weight.
That is the hollow corpus the method exists to avoid.

So adoption is not "write specs for your existing code."
It is "anchor your codebase's *next* decisions — plus a small seed of the load-bearing ones you recover by hand."

## Three moves

### Adopt at the change edge

Your next real change is your entry point.
When you build it, draft its story and the spec for the decision it embodies, implement, and anchor — the ordinary [loop](quickstart.md#the-loop).
Your corpus starts at one spec and grows with your work, the way clew's own grew to some eighty.
This is where most of the value is, and it costs nothing up front.

### Seed the load-bearing decisions

For the parts you will actually touch, author a handful of specs — a dozen, not a thousand — for the invariants and architecture decisions a new engineer would get wrong.
Recover them from the code *and from what the code does not hold*: the ADRs, the docs, the git history, the team's heads — because the *why* lives there, not in the source.
This gives your first anchors something to point at and makes the corpus a useful map early on.
It is optional; skip it for code you will not touch.

### Leave the rest unanchored

Dormant code has no spec, so it is not in the coverage universe — it is not a gap.
There is no pressure toward covering everything.
Coverage measures the decisions you *chose* to pin, not every line you have.

## What to seed, and what to skip

One test: would a new engineer get this wrong from the code alone?
An invariant that must always hold, a boundary, a constraint, a non-obvious reason a thing is shaped the way it is — seed it.
If the spec would only paraphrase the function, skip it.
Seed decisions, not descriptions.

Code-summary tools have a place here, but a narrow one: as raw material for a seed draft — a first-pass *what* — that you then sharpen into a decision by adding the *why*, the invariant, the alternative that was rejected.
A first draft, never the deliverable.

## The architecture file

`clew setup` also writes an architecture overview (`docs/spec/architecture.md`) — and here a spec and this file part ways.
A spec you seed *sparingly*, by hand, one decision at a time.
The architecture file is a **map**: on an existing project the setup skill derives it broadly from your build files, code, and structure.

Read it as a map of the territory you *have*.
Correct it to match reality; do not rewrite it into the architecture you wish you had — a map that describes code you do not have is worse than none.

Deriving the map is not "speccing your architecture."
The file is documentation — the frame every story is written against.
Its enforceable rules become `ARCH` / `CON` specs only as the code they constrain is built or changed: a handful of load-bearing constraints by hand, the rest at the change edge, exactly as you seed any other decision.
Having an `architecture.md` is not "my architecture is covered."

Where the real architecture is inconsistent, say so — do not smooth it over.
The map records what *is*; the direction you mean to steer toward is a decision you draft and anchor when you move the code there, at the change edge.
The gap between the two is visible work, not a fiction to hide in the file.

## Your first week

1. Bootstrap clew as in the [Quickstart](quickstart.md#1-scaffold-the-project) — `clew setup --type <your agent>`, then have the agent run the setup skill, which on an existing project derives your `004` and architecture from your build files, code, and docs — confirm the architecture describes the code you *have*, not the one you want.
2. Pick your next real change.
   Draft its story and spec, promote, implement, and anchor.
   Run `clew coverage` — you have your first **Covered** spec, anchored in your real code.
3. Optionally seed three to five load-bearing decisions for the area you are working in.
4. Repeat at every change.
   The thread grows where the work is.

## What "done" means here

Not "all code specced."
A low absolute spec count over a large codebase is expected and correct — the thread is valuable where it exists, in the parts under active change, not everywhere.

## When it is not worth it

A codebase you will not keep changing, or one you will not work on agentically and continuously, has no continuous thread to keep and little to gain.
clew earns its cost where the correspondence between intent and code is itself valuable — where code is maintained, handed off, or built on.

Next: the [Quickstart](quickstart.md) for the loop itself, and [What is CAS-DD?](../concepts/what-is-cas-dd.md) for the model.
