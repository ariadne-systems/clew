**Title**
Temporary minting numbers ids per author, the author resolved from `--as` or the environment

**Lens**: SW

**Description**
Minting a temporary id produces `<PREFIX>-TMP-[<AUTHOR>-]<NNN>` (SW-005, as revised).
The author is resolved in order — the `--as` option, then the `CLEW_DRAFT_AUTHOR` environment variable — and is **omitted** when neither is set, the solo default, with no fail-fast.
The number is the **maximum existing number for that `(prefix, author)` pair plus one**, or `001` when none exist, found by scanning the drafts location; the solo namespace is `(prefix, ∅)`.
Minting N ids in one call yields N consecutive numbers.
Core performs the scan and constructs the id, so where drafts live and how the id is formed stay core's knowledge.

**Rationale**
A readable, author-namespaced sequence is what review needs: drafts are author-local and short-lived, so per-author numbering — rather than a globally-random token — is enough to keep two independent authors from colliding while staying legible.
Resolving the author from `--as` then the environment lets a shared repo set a default once while a one-off `--as` overrides it; omitting it keeps the solo path frictionless.
Numbering by the maximum plus one keeps a freed number — a promoted or deleted draft — from being reused, so an id never recycles within a live namespace.

**Verification Description**
Solo (no `--as`, no `CLEW_DRAFT_AUTHOR`), `mint --tmp SW 3` yields `SW-TMP-001`, `SW-TMP-002`, `SW-TMP-003`; with `--as TS` it yields `SW-TMP-TS-001..003`, and `--as` overrides the environment.
With drafts present up to `SW-TMP-TS-004`, the next `TS` mint starts at `005`; another author's and the author-less drafts do not shift it.
Minting advances no bound sequence and takes no lock (CON-007).

## Relations

**Realizes**

- [SYS-005 — The system supports drafting, allocating, and finalizing specs](SYS-005-spec-lifecycle.md)

**Concerns**

- [CON-023 — A temporary id's author postfix is letter-led](CON-023-temporary-author-letter-led.md)
