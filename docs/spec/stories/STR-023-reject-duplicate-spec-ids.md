**Title**
A duplicate spec id is rejected, not silently collapsed

**Business Value**
The whole trace graph is keyed on the spec id, and the system promises ids are unique and stable (SYS-003).
But two files can end up declaring the same id — most easily when two branches each mint the next id off the shared state file and then merge.
Today the scan silently keeps whichever file it visited last; generation and coverage then act on one file and ignore the other, with no warning, so an author believes both specs exist while one is invisible.
Catching the duplicate and failing fast turns a silent, corrupting condition into an immediate, fixable error.

**Problem / Context**
`scan` (SW-013) keys the scanned specs by id and overwrites on collision — last-writer-wins, no diagnostic.
So two files with the same id — a bad merge, a hand-copied file, two branches that each minted the same number — collapse to one, and which one survives depends on directory traversal order.
That breaks the stable-identity guarantee (SYS-003) in practice, and it does so invisibly: nothing in generation or coverage reveals that a spec was dropped.

**Solution Approach**
Make the scan detect a duplicate id and fail fast with a clear, stable error naming the id and the conflicting files, instead of silently overwriting.
This is the same discipline the scan already applies to an ambiguous corpus — a spec that matches two spec sets, or none, is already rejected (CON-013) — extended to the most basic ambiguity of all, two files claiming one identity.
Detection is a read-only check folded into the existing scan walk: the first file to declare an id is recorded, and a second declaration of that id is an error rather than an overwrite.

**Acceptance Criteria**
- Two spec files declaring the same id (e.g. two `SW-032-*.md`) make the scan fail with a specific error code that names the id and both filenames.
- A project with no duplicate ids scans exactly as before; the error never fires on distinct ids.
- The rejection is deterministic — the same duplicate set yields the same error regardless of directory traversal order.
- The check is read-only and adds no state, and it runs before generation or coverage, so neither ever acts on a silently-collapsed set.
- Tests cover: two files with the same id are rejected; distinct ids are accepted; the error names the id and the conflicting files.

**Out of scope**
- Preventing duplicates at allocation — the minter already never reuses a number within one state file (CON-002); this catches duplicates that arise across that boundary (parallel branches), which allocation cannot see.
- Auto-resolving a duplicate (renumbering, picking a winner) — the tool reports the conflict; resolving it is the author's judgment.
- Detecting collisions on anything but the bound id (two specs sharing a title, say) — identity is the id.

## Relations

**Realizes**

- [SYS-003](../specs/SYS-003-stable-spec-identity.md)

**Realizes** (new specs)

- [CON-025](../specs/CON-025-one-file-per-spec-id.md)

**Related**

- Refines [SW-013](../specs/SW-013-scan-traceables.md) — it now rejects a duplicate id instead of collapsing it.
- Complements [CON-002](../specs/CON-002-sequence-number-never-reused.md) — allocation never reuses within a state file; this catches a duplicate that arises outside one, such as a branch merge.
- Mirrors [CON-013](../specs/CON-013-spec-set-partition.md) — the same fail-fast-on-an-ambiguous-corpus discipline.
