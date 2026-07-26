**Title**
Temporary draft ids are readable per-author sequences, not opaque tokens

**Business Value**
While authoring, an agent and a reviewer cross-reference a story and its dependent specs many times before anything is bound.
An opaque handle like `STR-021` carries no meaning: drafts cannot be told apart at a glance, and the relations between in-flight drafts are unreadable.
A legible handle like `STR-TMP-TS-001` makes each draft recognizable and keeps the web of cross-references between unpromoted drafts comprehensible during review.

**Problem / Context**
A temporary id today is `<PREFIX>-TMP-<opaque>`, where the suffix is a crypto-random hex token (SW-005).
The opacity buys coordination-free, global uniqueness — but at the cost of all readability, and that uniqueness is stronger than drafting needs.
Drafts are author-local and short-lived; what they actually require is that two people drafting independently do not collide, not that every token is globally random.

**Solution Approach**
Replace the opaque suffix with a readable sequence carrying an **optional** author postfix: `<PREFIX>-TMP-[<author>-]<NNN>`.
In a solo project no author is set, so a temporary id is simply `STR-TMP-001`; where independent authors share a repo, an author postfix namespaces the counter so they never collide — `STR-TMP-TS-001` — which is the single property the random token was guarding.
The author is resolved from the `--as` option, falling back to the `CLEW_DRAFT_AUTHOR` environment variable, and is **omitted** when neither is set (the solo default — no fail-fast).
The number is the **maximum existing number for that `(prefix, author)` plus one** — the solo namespace being `(prefix, ∅)` — found by scanning the existing drafts; with none present it starts at `001`, and minting N in one call yields N consecutive numbers. A promoted or deleted draft's number is not reused, so an id never recycles within a live namespace. Core does the scan, so id construction stays in core.
The `-TMP-` reservation (CON-008) is unchanged: a temporary id stays structurally distinct from every bound id and still parses by splitting on `-TMP-`.
Because the author postfix is optional, it must be unambiguous against the number: the author is letter-led (`[A-Z][A-Z0-9]*`), never bare digits, so `STR-TMP-001` reads as number-only and `STR-TMP-TS-001` as author + number, with no overlap.
Statelessness (CON-007) is preserved: the per-author draft counter is **not** the bound high-water mark — minting `--tmp` takes no lock and advances no bound sequence; finding the next number is a *read* of the drafts location, never a state write.

**Acceptance Criteria**
- In a solo project (no `--as`, no `CLEW_DRAFT_AUTHOR`), `mint --tmp SW 3` prints `SW-TMP-001`, `SW-TMP-002`, `SW-TMP-003`, one per line — consecutive within the call.
- With `--as TS` (or `CLEW_DRAFT_AUTHOR=TS`), the same call prints `SW-TMP-TS-001`, `SW-TMP-TS-002`, `SW-TMP-TS-003`; `--as` overrides the environment variable.
- With drafts already present up to `SW-TMP-TS-004`, the next `--tmp SW` mint for `TS` starts at `005`; a different author's drafts, and the author-less drafts, do not shift `TS`'s number — the counter is per `(prefix, author)`.
- The two forms never collide on parse: `STR-TMP-001` is read as number-only and `STR-TMP-TS-001` as author + number; an author that is not letter-led is rejected before any id is produced.
- Every temporary id still carries exactly one reserved `-TMP-` marker, and no bound id carries it (CON-008 unchanged).
- Promotion parses and substitutes both forms: every occurrence of `SW-TMP-001` / `SW-TMP-TS-001` is replaced by the bound id, with nothing left dangling (SW-017, CON-014).
- `--tmp` minting advances no bound sequence and takes no lock; a prefix's bound high-water mark is unchanged afterwards (CON-007).
- Vitest covers the solo and author forms, consecutive numbering within a call, the scan-derived start value, per-author isolation, the letter-led author rule and its ambiguity rejection, the `-TMP-` marker invariant, and promotion round-tripping both forms.

**Out of scope**
- The bound id scheme (sequential or opaque); this story changes only the *temporary* form.
- What promotion does beyond parsing the new suffix — binding, substitution, and the file move are unchanged (SW-017).
- **Concurrent minting by the same author** — the next number is read from the drafts at mint time, so two simultaneous mints for the same `(prefix, author)` are not supported; minting is serial (one author does not mint two drafts at once).

## Relations

**Realizes**

- [SYS-005](../specs/SYS-005-spec-lifecycle.md)

**Realizes** (new specs — temporary ids, bound on promotion)

- [SW-032](../specs/SW-032-temporary-minting-per-author-numbering.md)
- [CON-023](../specs/CON-023-temporary-author-letter-led.md)

**Related**

- Revises [SW-005](../specs/SW-005-mint-temporary-ids.md) — the temporary id form (now an optional author postfix) and its uniqueness mechanism (per-author / solo sequence).
- Amends [CON-007](../specs/CON-007-temporary-id-unbound.md) — the next-number scan is a read of the drafts location; the draft counter is not the bound high-water mark.
- Extends [SW-008](../specs/SW-008-mint-command.md) — adds the `--as` option.
- Supersedes part of [STR-007](../stories/STR-007-tmp-mint-mode.md) — its opaque-form solution approach.
