**Title**
A minted id's prefix must be a configured prefix

**Lens**: CON

**Status**: active

**Description**
Minting validates the requested prefix against the configured prefixes — the lens ids, plus the story and entity prefixes (ADR-0003).
A prefix that is not configured is rejected before any number is allocated: the mint fails with an explicit error and allocates nothing.
The configured prefixes are the single source of truth for id validity; no id pattern is consulted.

**Rationale**
The tool sells id discipline.
Admitting an id under an undeclared prefix would break the project's own taxonomy and the recognition the rest of the system — scanning, the index, resolution — relies on.
Rejecting before allocation also avoids burning a sequence number on an invalid request, so a later valid mint is not left with a gap it did not cause.

**Verification Description**
A configured prefix mints normally.
A prefix that is not configured (for example a lowercase or unknown prefix) is rejected with an explicit error, no id is returned, and the persisted high-water mark is unchanged.
Changing the configured lenses changes which prefixes are accepted; no id pattern is hard-coded in the minting code.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

## Changes

- **2026-06-23** — Renamed the file and the generated member from `id-matches-configured-pattern` to `id-prefix-must-be-configured`, to match the title that STR-009 had already rewritten from the id-token-pattern wording to the configured-prefix rule.
No change in meaning; the slug and the `CON_005_…` symbol were the last places still carrying the superseded "pattern" wording.
