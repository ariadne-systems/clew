**Title**
An incremental scan yields the same index as a full scan

**Lens**: CON

**Description**
The locations index an incremental scan produces is identical to the one a full scan of the same code state would produce — the same anchors, in the same shape and order.
Incrementality is an optimization of *how* the index is computed, never a change to *what* it contains: no anchor a full scan would find may be missing, and none it would not find may remain.
Whenever the incremental path cannot guarantee this — the change set is unavailable or cannot be trusted (no provenance, no version control, a changed scan configuration) — the scan falls back to a full scan rather than write a possibly-divergent index.

**Rationale**
Coverage, check, and the reverse-lookup all trust the index as a complete, faithful record of the code's anchors; an incremental scan that ever diverged from the full-scan result would silently corrupt that foundation — worse than a slow scan.
Making equivalence the invariant, and a full scan the fallback whenever equivalence is in doubt, keeps the optimization safe: an incremental scan may only ever be faster, never different.

**Verification Description**
For a range of code changes — modify, add, delete, rename — an incremental scan over the prior index yields the same index as a full scan of the resulting code.
Where the change set cannot be trusted — no provenance, no version control, a changed scan configuration — the scan falls back to a full scan and the result still matches.

## Relations

**Realizes**

- [SYS-002](SYS-002-reverse-traceability-coverage.md)

**Related**

- Constrains [SW-048](SW-048-scan-incremental-update.md).
- Guards the index written by [SW-023](SW-023-scan-command.md).
