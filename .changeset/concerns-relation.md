---
"@ariadne-thread/gen-typescript": minor
---

Add the `concerns` relation to the generated anchoring utility (ADR-0004).

Alongside `realizes` and `verifies`, the TypeScript generator now emits `concerns` for code that is coupled to a spec without realizing or verifying it — in the same two forms as `realizes` (a `concerns(ids, value)` wrapper or an `@concerns(ids)` class/method decorator) — plus the `Concerns<Id, T>` type marker beside `Realizes<Id, T>`.

The type markers now take the same list form as the function markers (`Realizes<[A, B], T>`), so a type or an interface can be anchored in source — a type alias directly, an interface through an `extends` clause or a sibling alias. The generated helper module documents all forms, including that several ids go in one list rather than stacked `extends` clauses (which collide on the marker property).

`concerns` is existence-checked only — a removed id breaks compilation, but nothing exercises the coupling — so it is weaker than `verifies` and is meant for couplings that are not already implied by a call.
