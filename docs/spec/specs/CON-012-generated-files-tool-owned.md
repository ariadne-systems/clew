**Title**
Generated traceables and utilities are tool-owned and never hand-edited

**Lens**: CON

**Status**: active

**Description**
The traceables and the anchoring utility are generated from the specs; they are owned by the tool and are never hand-edited.
clew writes into a reserved `clew` subdirectory of each generator's configured output directory, and regenerates that subdirectory from scratch on every run — clearing any file a rename, restructure, or removed spec left behind — so a stale generated file cannot linger.
It replaces that subdirectory atomically — writing the new output alongside it and swapping it in — so a run that fails partway leaves the previous output intact, and only the reserved subdirectory is ever replaced, never the configured directory around it.
Generation is deterministic: re-running on unchanged specs produces identical output.
A hand edit to a generated file is overwritten on the next run.

**Rationale**
The generated symbols are a projection of the specs, so the specs must be their only source; an edit that diverges from the specs would break the very correspondence the traceables exist to guarantee.
Determinism makes regeneration safe to run at any time and its output reviewable in version control.

**Verification Description**
Re-running generation on unchanged specs produces byte-identical output.
An edit to a generated file is reverted on the next run.
A generated file the current run no longer emits — left by a previous run under a different name or in a removed subpackage — is gone after regeneration.
A run that fails partway leaves the previous generated output intact.

## Changes

- **2026-07-04** — Generation now writes into a reserved `clew` subdirectory of the configured output directory and replaces it whole each run — writing to a temporary sibling and swapping it in — rather than pruning stale files by their generated marker.
The marker-based prune missed a stale file whenever the marker itself changed, or a file was re-emitted under a new name or location; replacing a clew-owned directory removes stale files by construction, the atomic swap keeps a failed run from destroying the last good output, and only the reserved subdirectory is ever touched.
