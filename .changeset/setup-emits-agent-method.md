---
"@ariadne-thread/clew": minor
---

Setup now emits the agent-facing method — the governance baselines and the clew skills — through a per-harness adapter interface, with Claude the first adapter (ARCH-008). The method is held as harness-neutral materials; an adapter writes them into its harness's locations, so the content is authored once and a new harness is one adapter plus its registration.

Alongside this, `clew setup`:

- **reconciles the method on re-run instead of clobbering it** — each emitted file carries a content hash in its marker, so a re-run updates a file the project has left untouched but preserves one it has edited (CON-033); the marker no longer says "do not edit", and clew's copyright is stripped as each file is emitted, since the method becomes the project's to own;
- gains `--agent <harness>`, recorded in the configuration and re-emitted for on a re-run;
- **fills an empty `generators` on a re-run** when `--generator` is passed, so a project scaffolded without a generator can add one (CON-010);
- seeds a narrative architecture overview at `docs/spec/architecture.md` instead of an agent-context stub (SW-046), and points the next-steps at filling it, drafting a story with the clew-draft skill, and `clew check`.
