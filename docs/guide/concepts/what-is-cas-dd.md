# What is CAS-DD?

CAS-DD — **code-anchored spec-driven development** — is the idea clew is built on: take spec-driven development, and anchor the specs *into the code*, so the thread between intent and implementation is one you can follow — instead of one you hope is still true.

## Where plain spec-driven development stops

Writing the spec first is worth doing.
But once the code exists, plain spec-driven development goes quiet about the part you need day to day: *given this spec, where is the code that does it? given this code, which spec does it answer to?*
The spec is a document and the code is code, with nothing tying them together — the connection lives in a comment, a ticket, or someone's memory, and it drifts the moment either side changes.
There is no thread to follow.

## The corpus: intent broken into addressable specs

CAS-DD does not capture intent as a single large specification.
It breaks intent into many small specs, each pinning exactly **one decision** — one behaviour, one constraint, one architecture decision, one stakeholder need, one non-functional quality.
A spec is a short markdown document with a stable, addressable id — `SW-004`, `CON-022`, `SYS-005` — carrying that one decision and a verification a test or a review can actually check.

The **corpus** is that whole body of small specs.
Keeping each decision separately addressable is what lets the rest of the method work: a code element can name the exact spec it answers to, instead of a section buried in a document someone still has to find.
The unit of a spec is the unit of anchoring.

Addressability does more than let code point at a spec.
Because every capability is a small, named, anchored unit, the corpus is also a **registry of what the system already does** — one an agent, or a person, can consult before building something new, to reuse an existing capability instead of duplicating it.

## Lenses

Each of those categories is a **lens** — a viewpoint the system is described through: a software behaviour (`SW`), a constraint (`CON`), an architecture decision (`ARCH`), a stakeholder or system need (`STK` / `SYS`), a non-functional quality (`NF`), and so on.
Categorising specs this way lets each kind be authored, counted in coverage, and numbered on its own.
A project declares its lenses in `.clewrc.json`; the lens is also the prefix of the ids minted for it (`SW` → `SW-001`, `SW-002`, …).

## Traceables: intent the compiler can see

For every `active` spec, a **traceable** is generated: a typed, compiler-visible symbol named after the spec's id:

```
SW-014-submit-order.md   →   SwTraceables.SW_014_SUBMIT_ORDER
```

The traceables are generated, never hand-written.
Add or retire a spec, run the generator, and the set of symbols changes with it.

## Anchors: code that names its intent

Code binds itself to a spec by referencing its traceable through one of three relations:

- **realizes** — this code *is* the spec's implementation.
- **verifies** — this test *exercises* the spec.
- **concerns** — this code is *coupled* to the spec without implementing or testing it — for example a configuration value that must stay consistent with a constraint spec it does not itself implement.

In TypeScript that looks like:

```ts
import { realizes, verifies, SwTraceables } from "../clew/traceables";

export const submitOrder = realizes(SwTraceables.SW_014_SUBMIT_ORDER, (order: Order) => {
  // …
});

verifies(SwTraceables.SW_014_SUBMIT_ORDER, () => {
  test("rejects an empty order", () => { /* … */ });
});
```

The marker syntax is the generator's — one form per language and per kind of element (a function, a class, a test, a type).
Because the anchor references a *generated symbol*, the language's own type checker enforces it: delete `SW-014` from the specs, regenerate, and every anchor that named it stops compiling — the compiler holds the *reference* live, so the link can't silently rot as the code changes.
The unit of traceability is sharper than "this feature has a spec": this specific code element realizes, verifies, or concerns this specific unit of intent.

## An anchor is a claim, not a proof

The build checks only that an anchor's spec **exists** — never that the code is **correct**.
`realizes` and `verifies` are *stated*, not *proven*: an anchor records that someone asserted this code implements or exercises the spec.
That is what makes it useful — when you change code that realizes a spec, you read the spec first and work from its intent, and where the code has drifted from that intent, the anchor is what points you at the drift.

In the vocabulary of agent harnesses, this makes the anchor a **computational sensor**: a deterministic signal — the type checker — that fires the moment the declared link goes stale, so an agent can correct itself before anyone reviews (Birgitta Böckeler's [harness engineering](https://martinfowler.com/articles/harness-engineering.html)).
Whether the code is *correct*, and not merely linked, is a softer, *inferential* signal — one for a test's assertions and for human or agent review to judge.

## Coverage: read the anchors backwards

The anchors point from code to spec.
Read them the other way and you get **coverage**: for each spec, does the code realize it, and does a test verify it?
"Done" is uniform — a spec is done when it is **both realized and verified**; coverage calls that state **Covered**.
A spec with no realizing anchor is an open gap the toolchain reports plainly; there is nothing to assemble at the end.

## Stories

Work is organised into **stories**.
A story is an increment — one change you set out to make — and it groups the specs that increment needs.
You draft a story together with those specs, and they travel together: promoting the story carries its specs into the corpus with it.
Where a spec is a single decision, a story is the unit of work that pulls a handful of them in.

## Next

- [The spec lifecycle](spec-lifecycle.md) — how a spec moves from planned to done.
- [Quickstart](../getting-started/quickstart.md) — the loop on a real example.
