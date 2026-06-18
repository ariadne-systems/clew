**Title**
Generated traceables and utilities are tool-owned and never hand-edited

**Lens**: CON

**Description**
The traceables and the anchoring utility are generated from the specs; they are owned by the tool and are never hand-edited.
Generation is deterministic: re-running on unchanged specs produces identical output.
A hand edit to a generated file is overwritten on the next run.

**Rationale**
The generated symbols are a projection of the specs, so the specs must be their only source; an edit that diverges from the specs would break the very correspondence the traceables exist to guarantee.
Determinism makes regeneration safe to run at any time and its output reviewable in version control.

**Verification Description**
Re-running generation on unchanged specs produces byte-identical output.
An edit to a generated file is reverted on the next run.
