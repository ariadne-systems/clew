**Title**
Add an `clew promote` command that finalizes reviewed drafts into the spec tree

**Business Value**
Promotion has two halves: integrating a draft into the corpus (judgment) and finalizing it (mechanics — bind a real id, replace its temporary id everywhere, move it into place).
The finalize half is done today by the agent with ad-hoc shell scripting, which is slow, unverifiable, and easy to get wrong: a single missed occurrence of a temporary id leaves a dangling reference in an already-promoted spec or another draft.
A command makes finalize deterministic, testable, and fast, and lets the `clew-promote` skill keep only the part that genuinely needs an agent — reasoning about how the new specs fit the existing ones.

**Problem / Context**
The `clew-promote` skill splits promotion into *integrate* (reason about relations, supersession, conflicts, duplication) and *finalize* (bind ids, substitute temporary ids project-wide, move drafts per the layout).
There is no command for finalize, so the agent performs it by hand each time: minting a bound id per draft, running a project-wide find/replace for every temporary id, and moving files into the spec tree.
This is mechanical and deterministic, yet it is re-derived ad hoc every promotion and is the step most likely to break — for example forgetting that a temporary id is also referenced from a spec promoted earlier, or from a draft not promoted in the same batch.

**Solution Approach**
Add `clew promote`.
Given the drafts to finalize — the pending drafts in the configured drafts location, or specific ones named — for each draft it:
- **binds** a real id by minting the draft's lens (the temporary id's prefix) without `--tmp`, which advances the state;
- **substitutes** every resolved temporary id project-wide: every occurrence of that exact id across the spec tree and the drafts location is replaced with its bound id — in the promoted draft's body and filename, in already-promoted specs and the domain model, and in any other unpromoted draft that referenced it;
- **moves** each draft into its place per the configured layout (a story to the stories directory, a spec to the specs directory), renaming the file to its bound id.

It reports each temporary-id → bound-id mapping and that the state advanced.
It requires a configuration (CON-011), like every command, and it does not commit.
The command does only the mechanical finalize; the integration reasoning and any edits it implies stay in the `clew-promote` skill and with the user.

**Affected specs and artifacts**
- New `SW` spec — the `promote` command surface (thin; delegates to core).
- New `SW` spec — finalize in core: bind each draft's id, substitute its temporary id project-wide, and move it into the layout.
- New `CON` spec — after a successful promote, no occurrence of a promoted draft's temporary id remains anywhere in the project (the substitution is exhaustive).
- Reuses and updates `CON-011` — a command requires a configuration; its enumeration (today `mint`, `init`) is generalized to also cover `spec` (which already requires config) and `promote`, so it stops being a stale list.
- Updates the `clew-promote` skill — its Finalize section delegates the mechanical steps to `clew promote` instead of describing them as manual edits; the Integrate section is unchanged.

**Acceptance Criteria**
- `clew promote` binds a real id for each named (or pending) draft by minting the draft's lens — the temporary id's prefix — advancing the state.
- Every occurrence of each resolved temporary id is replaced project-wide, including references from an already-promoted spec and from an unpromoted draft; no occurrence of the temporary id remains after the run.
- Each draft file is moved into its configured location with its filename updated to the bound id.
- The command reports each temporary-id → bound-id mapping and that the state advanced.
- With no configuration present, the command directs the user to `setup`, like the other commands.
- The command performs no integration reasoning and does not commit.
- Vitest covers: binding and filename rename; project-wide substitution reaching both an already-promoted spec and an unpromoted draft; moving each draft to the right directory; and that no temporary id is left behind.

**Out of scope**
- The *integrate* half of promotion — relations, supersession, conflict, and duplication reasoning — stays in the `clew-promote` skill; the command never decides what a draft means for the corpus.
- Applying the confirmed integration edits to affected existing specs (new relations, supersession notes) — judgment, stays with the agent.
- Merging an entity draft into the domain model — a content merge, not a file move; the first cut finalizes file-based drafts (stories and specs), and entity-draft promotion stays manual (a possible follow-on).
- Committing — left to the user, as everywhere.

**Decisions** (resolved)
- **Entity drafts** — file-based only. The command finalizes stories and specs (file move + rename); merging an entity draft into `domain-model.md` is a content merge, left out of the first cut (manual, or a follow-on). Keeps the command fully deterministic.
- **Draft selection** — promote-all by default, named optional. `clew promote` with no arguments finalizes all pending drafts; `clew promote <id|path>…` finalizes only the named ones. The skill decides which drafts are integration-ready and passes them.
- **Substitution scope** — across the configured spec locations (stories, specs, the domain model) and the drafts location, the only places a temporary id can appear. Code is not scanned; temporary ids never appear there.
- **Failure semantics** — bind all ids first, then substitute, then move, failing fast with a clear error. Minting advances state irreversibly, so a later failure leaves the bound ids spent; that is acceptable because ids are cheap and never reused (CON-002), not a transactional rollback.

## Relations

**Realizes**

- [SW-016 — The tool exposes a `promote` command that delegates to core](../specs/SW-016-promote-command.md)
- [SW-017 — Finalize reviewed drafts into the spec tree](../specs/SW-017-finalize-drafts.md)
- [CON-014 — Promotion substitutes a draft's temporary id exhaustively](../specs/CON-014-exhaustive-substitution.md)

This story depends on the existing `mint` allocation (STR-004) and the configured layout (ENT-002), and revises the `clew-promote` skill.

## Changes

- **2026-06-21** — Renamed skill references `ariadne-promote` → `clew-promote` to match the CLI's rename to `clew`.
Names only; the spec's meaning is unchanged.
- **2026-06-28** — Two of this story's resolved decisions are superseded by STR-025.
The **draft-selection** decision (promote-all by default; named drafts optional) is replaced by rooting promotion at one or more named drafts — a story, which carries its specs through its references, or a spec — or the keyword `all`, with the no-argument form removed (CON-028, SW-016).
The **substitution-scope** decision (substitute project-wide, including already-promoted specs and the domain model) is replaced by substituting only within the drafts of the resolved set and refusing an unresolved reference, so the promoted tree is never rewritten (CON-014, CON-027).
The binding/move mechanics are unchanged.
