# clew

Compile-checked, id-anchored traceability between specifications and the code that realizes them — the CLI for **Code-Anchored Spec-Driven Development (CAS-DD)**.

clew turns each active spec into a generated, language-native symbol — a **Traceable** — and lets code declare how it relates to that spec:

- `realizes` — production code implements the specified behaviour;
- `verifies` — a test checks it;
- `concerns` — code is coupled to the spec without implementing it.

Because the reference is a generated symbol, the compiler holds it: a typo does not compile, and deleting a spec breaks every anchor that still names it. Read the anchors in reverse and you get **coverage** — which specs the code claims to realize and verify.

Works with **TypeScript** and **Java** today; language support is generator-based.

## Install

```bash
npm install -g @ariadne-thread/clew
```

Requires Node.js 22 or newer.

## Get started

```bash
clew setup      # scaffold config, layout, and the agent skills
clew coverage   # report which specs the code realizes and verifies
clew check      # run the integrity-check suite over the corpus
```

An anchor references a generated symbol, so the compiler enforces the link:

```ts
import { realizes, SwTraceables } from "../clew/traceables";

export const submitOrder = realizes(
  SwTraceables.SW_014_SUBMIT_ORDER,
  (order: Order) => {
    // …
  },
);
```

In normal use an AI coding agent drives the loop — **draft → promote → implement & anchor → check coverage** — through clew's skills; you direct and review, and run `clew coverage` / `clew check` (or a CI gate) for the assurance view.

**covered ≠ correct**: an anchor proves the declared link points at a live spec, not that the code is right. Review still judges the work at both ends.

## Documentation

The full guide, quickstart, and concepts live in the repository:

https://github.com/ariadne-systems/clew

## License

Apache-2.0
