---
"@ariadne-thread/gen-typescript": minor
---

The TypeScript generator now emits a `README.md` into its output folder, documenting the markers — the realizes / verifies / concerns relations and the form of each by the kind of element anchored (value, function, class, method, test, type, interface), with examples drawn from a real spec id. An author or agent can read how to anchor from beside the generated symbols rather than from a separate copy that could drift. The helper module's inline overview is reduced to a pointer to the README; the per-symbol JSDoc remains.
