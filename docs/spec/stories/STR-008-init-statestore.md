**Title**
Initialize the StateStore from existing artifacts

**Status**: done

**Business Value**
Adopting the tool on a project that already has ids, or recovering after the state file is lost or stale, requires the StateStore to reflect every id already in use.
Computing those high-water marks by hand from the files is error-prone and is exactly the manual calculation the tool exists to remove.
A command that derives the marks from the artifacts makes bootstrap and recovery a single, reproducible step, and keeps state and artifacts from drifting silently.

**Problem / Context**
`clew mint` (STR-005) is authoritative only when `.clew/state.json` already reflects every allocated id.
On an existing project, or after the state file is lost or hand-edited, there is no command to establish or restore it; the per-prefix high-water marks must be read off the files by hand.
This was just done manually to seed STR, SW, CON, ARCH, and NF — which is precisely the drift-prone step the tool should own rather than the user.

**Solution Approach**
Add an `clew init` command that discovers the ids present in the project's artifacts, computes the highest number per prefix, and writes them as the StateStore's high-water marks.
Reconciliation only ever raises a mark to cover a discovered id; it never lowers an existing mark, because a number once allocated is never handed out again (CON-002, CON-009).
Discovery reads the artifact tree, a stable filesystem facility; the broader code-annotation scanning that the index will use is informative here, not required.
The command is idempotent: running it again on an unchanged project leaves the state unchanged.

**Acceptance Criteria**
- Running the command on a project whose artifacts are STR-001..007, SW-001..005, CON-001..008, ARCH-001..002, NF-001..002 writes high-water marks STR=7, SW=5, CON=8, ARCH=2, NF=2.
- The command never lowers an existing high-water mark; a mark already at or above every discovered id is left unchanged.
- After init, a subsequent `mint` for a prefix continues immediately after the discovered mark (the next `SW` is `SW-006`).
- Running init twice on an unchanged project produces no change on the second run.
- A prefix with no artifacts contributes no mark.
- Vitest covers: derivation of marks from a fixture artifact set, the never-lower invariant, and idempotency.

**Out of scope**
- The code-annotation scanning, the index, and resolution; discovery here reads the artifact tree, and the full scanning capability is its own story.
- Detecting or reporting orphan state entries or gaps (state ahead of artifacts) — a later diagnostics story if needed.
- Migrating, renaming, or rewriting ids.

## Relations

**Realizes**

- [SW-006](../specs/SW-006-derive-high-water-marks.md)
- [SW-007](../specs/SW-007-reconcile-command.md)
- [CON-009](../specs/CON-009-reconcile-never-lowers.md)

## Changes

- **2026-07-17** — Re-pointed the SW-007 link to its renamed file and title: the command was renamed `init` → `reconcile` (SW-007), moving the slug to `SW-007-reconcile-command`.
A mechanical rename of a referenced name; this story's own meaning is unchanged.
