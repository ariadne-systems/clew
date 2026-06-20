# ADR-0004: A small, named relation taxonomy for code-to-spec anchors

- Status: Accepted.
- Date: 2026-06-20
- Deciders: project maintainer.
- Refines: ADR-0001 (compile-checked, id-anchored traceability).

## Context

ADR-0001 D1 establishes that a trace lives in the code and references a stable spec id, with existence enforced by the target language's type-checker.
It speaks of "a trace" generically and does not enumerate *kinds* of relation.

In practice two relations emerged in the generated anchoring utility: `realizes`, for the code that implements a spec, and `verifies`, for the test that checks it.
These cover realization and verification.

A third relationship recurs and has no home: code that is *coupled to* a spec without implementing or testing it — a class that depends on a behaviour anchored elsewhere, a function whose correctness rests on a constraint it does not itself enforce.
Today that relationship lives only in prose comments such as `// (SW-001)`.
A comment is an unverifiable assertion: it can be wrong when written, it rots silently when the code or the spec moves, and following it is a heuristic text search rather than a resolved reference.
That is the exact failure mode the whole approach exists to replace, so leaving cross-cutting relations in comments undermines the mechanism.

The question is whether such relations should be left in comments, derived from the call graph, or made first-class checked anchors — and if checked, under what name and with what guarantee, so the vocabulary stays meaningful instead of becoming a second comment system.

## Decision

### D1 — Three named relations, and no catch-all

The anchoring vocabulary is fixed at three relation kinds, each a generated marker constrained to `TraceableId`, emitted in the forms its targets require:

- **realizes** — `realizes(id, value)` for a value or function, `@realizes(id)` for a class or method: the code element is the spec's implementation.
- **verifies** — `verifies(id, run)`: the test exercises the spec's behaviour.
- **concerns** — `concerns(id, value)` for a value or function, `@concerns(id)` for a class or method: the code element is coupled to the spec — depends on it, is constrained by it — without realizing or verifying it.

The type-level markers `Realizes<Id, T>` and `Concerns<Id, T>` express the realizes and concerns relations on a type.
The vocabulary is deliberately closed; a new relation kind requires its own decision recorded here.

Rationale.
realizes, verifies, and concerns map to the three questions the trace graph must answer: what implements X, what checks X, and what else is coupled to X.
A precise verb per relation keeps the graph legible.
A single open verb such as `relatesTo` invites anchoring everything to everything until the graph no longer discriminates; the discipline of a narrow verb is what makes a relation worth recording.

Rejected alternative.
A single, open `relatesTo` / `related` marker: vague relations proliferate and the graph stops meaning anything.

### D2 — `concerns` is existence-checked, not behaviour-checked

A `concerns` anchor guarantees only that the referenced spec exists and stays live: remove the spec, regenerate, and the anchor stops compiling (ADR-0001 D1).
It does not guarantee the coupling still holds — nothing exercises a "concern" the way a `verifies` test exercises a behaviour.
It is therefore strictly weaker than `verifies` and must not be read as verification.

Rationale.
Naming the weaker guarantee explicitly stops `concerns` from being mistaken for a test.
It is still strictly stronger than a comment, which guarantees neither existence nor liveness, so it raises the floor without overclaiming.

### D3 — Relations that matter are declared, not inferred

A cross-cutting relation the author considers important is recorded explicitly with `concerns`, not left for an analyzer to reconstruct from the call graph.

Rationale.
Derivation from the call graph is only as complete as the static graph: indirection, dynamic dispatch, and couplings that are not calls all escape it.
An explicit anchor is robust to all of these and states intent.
Derivation remains useful as a supplementary view — the context skill still walks the graph to surface neighbours — but it is not the system of record for a relation that matters.

Rejected alternative.
Derive all soft relations from the call graph and never declare them: fragile, and silent about intent.

### D4 — A comment is never the trace

A spec id mentioned in a prose comment is documentation, never a trace.
The trace graph is computed from the three markers only; comment text is not scanned for ids.

Rationale.
A comment that carries traceability is an unverifiable assertion that rots silently, which is the failure the mechanism removes.
Keeping comments out of the trace is what lets the graph be trusted as a whole, rather than audited item by item.

### D5 — Anchoring across element kinds, including interfaces

Each marker is emitted in the forms its target requires, so every kind of element can be anchored in source.
The anchor needs only to exist for the type-checker; it never needs a runtime form.

- a value or function — `realizes(ids, value)` / `concerns(ids, value)`;
- a class or method — the decorator `@realizes(ids)` / `@concerns(ids)`;
- a test — `verifies(ids, run)`;
- a type — `Realizes<ids, T>` / `Concerns<ids, T>` on the alias;
- an interface — the same type marker through an `extends` clause (`interface I extends Realizes<ids, {}> { … }`) or a sibling alias (`type _ = Realizes<ids, I>`).

`ids` is a single member or a non-empty list.
At the type level several ids go in one list in one marker; two separate `extends Realizes<…>` clauses are rejected because they collide on the marker property, so ids are combined, never stacked.

An interface therefore does not depend on being anchored only through its implementations: it can carry its own checked anchor.
Anchoring a seam through its implementations and tests remains available, and is often enough when the spec is already anchored there.

Rationale.
The marker is a compile-time reference, not a runtime construct, so the type system reaches the cases a decorator cannot — a free function, a type, an interface.
A single list per marker keeps the type-level spelling consistent with the function spelling and sidesteps the property collision an interface would otherwise hit.

## Scope and boundary

The taxonomy is language-neutral (ADR-0001 D9): every generator emits all three relations in its idiom, and the core, index, and resolver treat them uniformly.
`concerns` becomes part of the generator contract — the third marker a generator must emit.
The TypeScript generator is the first implementation (SW-018); the Java generator follows the same contract.

`concerns` is a forward, advisory relation and is not subject to the reverse-direction completeness check (ADR-0001 D6): a spec does not require a `concerns` anchor, so the build never fails for a missing one.

When the index and resolver are built (ADR-0001 D4) they surface the three relations distinctly: realizes and verifies supply forward and verification context, and concerns supplies impact-analysis breadth — when a spec changes, what else is coupled to it.

## Consequences

The generated anchoring utility gains the third relation: `concerns` (in the same value-and-decorator forms as `realizes`) and the `Concerns<Id, T>` type marker (alongside `Realizes<Id, T>`).
SW-018 is amended for the TypeScript generator; the Java generator gains the analogous emission.

Prose `(SPEC-ID)` references in code become non-authoritative.
A follow-up cleanup demotes them to intent-only comments or replaces them with `concerns` anchors where the coupling is real, so the markers are the single traceability layer.

`concerns` raises the floor — no dangling reference, no silent removal — without claiming behavioural correctness; review and `verifies` tests remain responsible for that, consistent with ADR-0001's scope of guarantee.

The vocabulary stays small by design.
The cost of the discipline is that a genuinely new relation needs a new decision here rather than an ad-hoc marker, which is the intended friction.
