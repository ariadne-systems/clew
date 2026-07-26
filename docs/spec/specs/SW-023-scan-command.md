**Title**
The tool exposes a `scan` command that reports the code's anchor locations

**Lens**: SW

**Status**: active

**Description**
`clew scan` runs the code scan and reports the anchor locations it finds — each a spec id, its relation, and its file-and-line.
It is the *check* side of the tool, distinct from `spec`, which is the *declare* side (specs → traceables; SW-012): `spec` writes the markers' definitions, `scan` reads the markers' uses back out.
The command is thin: it delegates to the core, which updates the **locations index** incrementally where it safely can and rebuilds it fully otherwise (SW-048, on the core scan SW-022), and it presents the result; the index is the shared `locations.json` shape (ADR-0005 D6).
A `--full` flag forces a full rebuild.
The index is written **atomically** — to a temporary file, then renamed into place, the same discipline as the state write (NF-002) — so a crash mid-scan never leaves a partial or empty index that a later coverage run would trust as complete.
Like the other commands it requires a configuration; with none present it directs the user to `setup` (CON-011).

**Rationale**
The scan result is the foundation the later coverage and traceback commands consume, so a command that runs the scan and emits the locations index makes the foundation usable and testable on its own, and produces the shared artifact other tools read.
Keeping the command thin — presentation over a core capability — preserves the rule that business logic lives in the core, not the CLI.

**Verification Description**
`clew scan` over a project reports every anchor the scan finds, and writes the locations index in the shared shape — updated incrementally where it safely can, rebuilt fully otherwise (SW-048), and `--full` forces a rebuild.
The index is written atomically: an interrupted run leaves the previous index intact, never a partial one.
The command contains no scanning logic of its own — it delegates to the core.
With no configuration present, it directs the user to `setup` rather than failing opaquely.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-002](SYS-002-reverse-traceability-coverage.md)

**Related**

- Delegates to the incremental index update of [SW-048](SW-048-scan-incremental-update.md); a `--full` flag forces a full rebuild.

## Changes

- **2026-07-27** — The command now delegates to the incremental index update (SW-048): it rescans only version control's changed set where it safely can, and rebuilds the whole index otherwise or with `--full`.
The prior "full, not incremental" statement is revised; the atomic-write and thin-command guarantees are unchanged.
