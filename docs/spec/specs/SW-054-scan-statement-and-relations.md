**Title**
The spec scan reads each spec's statement and parent relations

**Lens**: SW

**Status**: planned

**Description**
The spec scan reads each spec's **Description** — its statement — and the ids under its **Realizes** relation — its parents — onto its scanned spec, beside the id, lens, and status it already reads (SW-031).
A spec with no **Realizes** relation has no parents; the statement is the Description text.

**Rationale**
The export needs each spec's statement and parent edges, and the scan is where a spec's fields are already read once, alongside the id, lens, and status — so the two new fields are captured there rather than by a second, divergent read of the spec files.

**Verification Description**
A spec with a Description and a Realizes relation yields a scanned spec carrying that statement and those parent ids; a spec with no Realizes relation yields no parents.

## Relations

**Realizes**

- [SYS-016](SYS-016-cross-tool-trace-export.md)

**Related**

- Extends the spec scan of [SW-031](SW-031-scan-spec-status.md) — reading the statement and relations beside the status.
- Consumed by [SW-053](SW-053-trace-manifest-emitter.md).
