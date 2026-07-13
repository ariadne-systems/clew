**Title**
The method scaffold is tool-owned but project-editable; setup reconciles it and never clobbers a hand edit

**Lens**: CON

**Status**: active

**Description**
The emitted method scaffold — the governance baselines and the clew skills — is tool-owned by default: clew authors it, marks each file with a content hash, and maintains it across runs.
It is not immutable, though: the project may edit any method file, and a re-run then preserves that edit rather than reverting it.
On each setup run clew reconciles every method file against the hash it recorded — a file still pristine (unchanged since clew wrote it) is updated to the tool's current version, while a file the project has edited, or one whose marker it has removed, is left exactly as the project has it.
A project-owned file is likewise never overwritten: the configuration (CON-010), a seeded project stub once it exists, and any spec are left as the project has them.
Because the emitted method becomes the project's own governance, setup strips clew's copyright as it places each file — the project owns and licenses what it carries.
Re-running setup therefore advances the method to the tool's current version wherever the project has not taken it over, and touches nothing the project has made its own, so a re-run is always safe.

**Rationale**
The method is clew's current governance and skills, so the tool must be free to keep it current; but it is also the project's governance to shape, so a deliberate customization must survive a re-run.
Recording a content hash lets setup tell the two apart without prompting: it refreshes what the project has left alone and defers to what the project has changed.
This is a deliberate departure from the generated traceables (CON-012), which are pure build output never meant to be edited; the method scaffold is instead a starting point the project owns.

**Verification Description**
Re-running setup updates an unedited method file to the tool's current content, and preserves a method file the project has edited.
Re-running setup leaves the configuration, every existing project stub, and every spec byte-for-byte unchanged.
A freshly emitted method file carries the tool marker with a content hash; a project stub and the configuration do not.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Related**

- Departs from [CON-012 — Generated traceables and utilities are tool-owned and never hand-edited](CON-012-generated-files-tool-owned.md): the traceables are pure build output and are never edited, whereas the method scaffold is the project's governance to customize, so setup reconciles it rather than regenerating it wholesale.
- Extends [CON-010 — Setup never overwrites an existing configuration](CON-010-setup-never-overwrites.md) from the configuration to every project-owned file setup can touch.

## Changes

- **2026-07-12** — Set active: implementation of STR-031 began.
- **2026-07-12** — Reframed from wholesale re-emit (hand edits reverted) to hash-based reconcile (an unedited file is updated to the tool's version, an edited file is preserved).
The method scaffold is the project's governance to customize, so a re-run must not clobber a deliberate edit; a content hash in each file's marker distinguishes an unedited file from a customized one.
This departs from the CON-012 tool-owned model the spec originally mirrored.
The slug and traceable name are left unchanged to avoid churning every anchor for a rename.
- **2026-07-12** — Setup now strips clew's copyright from a method file as it is emitted, and a re-run migrates a pre-hash marked file to the current scheme.
The emitted method is the project's governance to own and license, so clew's copyright must not travel into it.
