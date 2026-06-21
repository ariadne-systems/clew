**Title**
The tool exposes a `scan` command that reports the code's anchor locations

**Lens**: SW

**Description**
`clew scan` runs the code scan and reports the anchor locations it finds — each a spec id, its relation, and its file-and-line.
It is the *check* side of the tool, distinct from `spec`, which is the *declare* side (specs → traceables; SW-012): `spec` writes the markers' definitions, `scan` reads the markers' uses back out.
The command is thin: it delegates to the core scan (SW-022) and presents the result, and it also writes the located anchors as the **locations index** — the shared `locations.json` shape (ADR-0005 D6).
The index is written **atomically** — to a temporary file, then renamed into place, the same discipline as the state write (NF-002) — so a crash mid-scan never leaves a partial or empty index that a later coverage run would trust as complete.
Like the other commands it requires a configuration; with none present it directs the user to `setup` (CON-011).

**Rationale**
The scan result is the foundation the later coverage and traceback commands consume, so a command that runs the scan and emits the locations index makes the foundation usable and testable on its own, and produces the shared artifact other tools read.
Keeping the command thin — presentation over a core capability — preserves the rule that business logic lives in the core, not the CLI.

**Verification Description**
`clew scan` over a project reports every anchor the core scan finds, and writes the locations index in the shared shape, replacing any existing index (the scan is full, not incremental).
The index is written atomically: an interrupted run leaves the previous index intact, never a partial one.
The command contains no scanning logic of its own — it delegates to the core.
With no configuration present, it directs the user to `setup` rather than failing opaquely.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
