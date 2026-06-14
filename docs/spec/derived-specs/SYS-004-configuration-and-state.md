**Title**
The system keeps version-controlled per-project configuration and allocation state

**Lens**: SYS

**Description**
The system shall keep version-controlled, per-project configuration and id-allocation state as plain files in the repository.

**Rationale**
Configuration and the allocation record must travel with the code and be reviewable as diffs; holding them in the repository keeps a single source of truth that branches and merges with everything else.
The tool only writes text and runs locally, so config and state are plain committed files, not a database it owns (ADR-0001 D5).

**Verification Description**
The configuration and state are files under the project root; reading them reflects the committed content; a missing file or attribute falls back to documented defaults.

## Relations

**Realizes**

- [STK-004 — Traceability data living with the code](STK-004-traceability-with-the-code.md)
