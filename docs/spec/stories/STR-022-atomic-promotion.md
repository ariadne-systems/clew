**Title**
A failed promotion leaves the spec tree unchanged

**Business Value**
Promotion mints permanent ids and rewrites many version-controlled files in one run.
Today a mid-run failure — a file locked by an editor on Windows, a permission error, a full disk — leaves a half-promoted corpus: some files substituted, some drafts moved, some not.
Untangling that by hand is slow and error-prone, and it contradicts the safety the tool implies.
Making promotion all-or-nothing turns a failed run into a non-event the user simply re-runs, and the corpus is never left in a broken in-between.

**Problem / Context**
`promote` (SW-017) binds ids, then substitutes the temporary id project-wide (CON-014), then moves each draft — in place and sequentially, with no isolation between the steps.
If a later `rename` fails, the substitution has already been written and some drafts already moved, so the tree is half-promoted; re-running then re-mints against drafts whose content is already substituted, compounding the mess.
Separately, an in-place `writeFile` is not atomic, so an interruption mid-write can leave a single file partially written.
The current code even claims a failure "never leaves a half-substituted tree" — which oversells a guarantee the code does not provide.

**Solution Approach**
Split promotion into a **prepare** phase that mutates nothing real and a **commit** phase that is renames only.
- Prepare: resolve every target, mint the bound ids, compute each rewritten file's new bytes, and write each to a temporary sibling file. Everything that can realistically fail happens here; if anything throws, delete the temporaries and abort, leaving the real tree untouched.
- Commit: `rename` each temporary over its real file, and each draft into its bound-id target. `rename` is atomic per file, so a file is always wholly old or wholly new — this also removes the partial-write risk — and the only failure window is a fast batch of renames.
- Minted ids are **not** rolled back: CON-002 forbids reuse, not gaps, so a number an aborted run consumed is a harmless gap. Rolling back files is trivial (delete temporaries); un-advancing the sequence is not attempted.
- Recovery beyond that stays the user's: the data is version-controlled (STK-004), so git is the backstop. The tool does not auto-revert — that would clobber unrelated uncommitted work and miss untracked state.

**Acceptance Criteria**
- A promotion that fails while preparing its changes — computing the rewrites, staging them to temporary files, and checking each target is placeable, all before anything is committed — leaves the spec tree and the drafts location byte-identical to before the run.
- Each file `promote` rewrites is written atomically (a temporary file then a rename), so an interrupted run never leaves a partially written file.
- A successful promotion is unchanged in outcome: ids bound, every occurrence substituted (CON-014), drafts moved, the temporary-id → bound-id mapping returned (SW-017).
- After an aborted promotion, re-running completes cleanly; a minted id may leave a gap (CON-002), but no id is reused and nothing is left dangling.
- The tool does not auto-revert through version control; recovery of an aborted run relies on the unchanged tree, with git as the user's own backstop.

**Out of scope**
- Reclaiming the minted sequence numbers — a gap is acceptable (CON-002); un-advancing the bound counter is not attempted.
- A crash-resilient journal that *resumes* a half-finished commit — true atomicity across many renames needs a manifest, heavier than a local, git-tracked tool warrants; revisit only if real partial-commit failures appear.
- Concurrent promotions — promotion is a serial, interactive operation.

## Relations

**Realizes**

- [SYS-005](../specs/SYS-005-spec-lifecycle.md)

**Realizes** (new specs)

- [CON-024](../specs/CON-024-atomic-promotion.md)

**Related**

- Refines [SW-017](../specs/SW-017-finalize-drafts.md) — its substitution and move now run as prepare-then-commit, applied through atomic renames.
- Complements [CON-014](../specs/CON-014-exhaustive-substitution.md) — CON-014 governs a successful run (no occurrence left behind); this governs a failed run (no change left behind).
- Hardens [STR-013](../stories/STR-013-promote-command.md) — the command whose finalize step this makes atomic.
