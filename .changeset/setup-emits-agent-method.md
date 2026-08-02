---
"@ariadne-thread/clew": minor
---

Setup now emits the agent-facing method — the governance baselines and the clew skills — so a scaffolded project is ready for an agent to work rather than a bare configuration a human must complete by hand. The method is held as agent-neutral materials, authored once.

Alongside this, `clew setup`:

- **reconciles the method on re-run instead of clobbering it** — each emitted file carries a content hash in its marker, so a re-run updates a file the project has left untouched but preserves one it has edited (CON-033); the marker no longer says "do not edit", and clew's copyright is stripped as each file is emitted, since the method becomes the project's to own;
- **fills an empty `generators` on a re-run** when `--generator` is passed, so a project scaffolded without a generator can add one (CON-010);
- seeds a narrative architecture overview at `docs/spec/architecture.md` instead of an agent-context stub (SW-046), and points the next-steps at filling it, drafting a story with the clew-draft skill, and `clew check`.
