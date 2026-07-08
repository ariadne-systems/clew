---
"@ariadne-thread/clew": minor
---

Anchor the tool's own implementation and tests to their specs, so the codebase is traced by the mechanism it provides.

Every software spec, constraint, architecture spec, and non-functional spec (all 37 `SW`/`CON`/`ARCH`/`NF` ids) is now referenced from the code that realizes it and the test that verifies it, using the generated anchoring utility from `@ariadne-thread/trace`:

- production code is marked with `realizes(id, …)` on the realizing function or value, and the `@realizes(id)` decorator on the realizing class (for example `SequentialIdStrategy`, `OpaqueIdStrategy`, `AriadneError`);
- tests are wrapped in `verifies(id, …)` on the suite that exercises the spec;
- where a spec relates to more than one id, all of them are anchored.

`@ariadne-thread/clew` now depends on `@ariadne-thread/trace`. The anchors are inert at runtime — `realizes` returns its value, the decorator is a no-op, `verifies` runs its tests — so behaviour is unchanged; deleting a spec now breaks compilation at every anchor that named it.
