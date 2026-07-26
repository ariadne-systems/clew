**Title**
`clew check` catches a cited ADR id that resolves to no ADR

**Business Value**
ADRs are the durable *why* behind the ARCH and CON specs — cited around forty times across the corpus, from Rationale throughout.
But an ADR citation is a bare `ADR-NNNN` token in prose, not a markdown link, so reference-rot (CON-029, which resolves links) never checks it: an ADR that is renamed or never added leaves every citation of it dangling, and `clew check` reports OK.
That is the same silent rot the tool exists to kill, on the one edge it does not watch — the spec-to-ADR edge.
A check that resolves every cited ADR id to a real ADR file closes it, for every project that runs `clew check`.

**Problem / Context**
ADRs sit half in, half out of clew's model: setup seeds an ADR template and practice (SW-045), but the layout has no ADR entry, no id is minted for them, and nothing checks a citation.
ADRs are not traceables and must not become them — code never anchors an ADR, so a minted, promoted ADR would be an uncoverable member of the coverage universe.
What ADRs need is not traceability but reference integrity: a cited ADR id must resolve.
Because citations are bare tokens at sub-file, decision-point granularity — an `ADR-0005 D6` names a decision within an ADR — resolving them is a token scan against the ADR directory, distinct from reference-rot's link resolution.

**Solution Approach**
Fix clew's stance on ADRs as *referenced documentation, not traceables*: they are authored in the ADR directory, cited by id from spec Rationale, and stay outside the coverage universe — never minted, promoted, or anchored.
Declare the ADR directory in the layout so the tool knows where they live, and add one member to the `clew check` suite that scans every corpus document for `ADR-NNNN` tokens and reports any that resolve to no file in the ADR directory (the decision-point suffix is informational — resolution is file-level).
It is a sibling of reference-rot, not folded into it: reference-rot resolves links, this resolves bare id tokens.
As with reference-rot and the id-only check, a token quoted inside an inline- or fenced-code span is an example, not a citation, and is not flagged — so a spec about ADR-checking can show the form.
State the stance in the spec conventions (006) so a reader knows ADRs are the why behind ARCH and CON, not part of the trace graph.

**Acceptance Criteria**
- A cited `ADR-NNNN` token that resolves to a file in the layout's ADR directory is accepted; one that resolves to no file is reported with its location.
- The decision-point suffix is not required to resolve — resolution is file-level, so an `ADR-0005 D6` citation resolves as long as ADR-0005 exists.
- The layout carries an `adr` directory, and the check resolves against it.
- ADRs generate no traceable and stay outside coverage — the check adds only reference integrity, no coverage obligation.
- A token quoted inside an inline- or fenced-code span is treated as an example, not a citation, and is not flagged — so a spec can show the form it governs.
- The check ships in the suite, and a clean corpus exits zero.
- Tests cover a resolving citation, a dangling citation, the decision-point suffix, a code-span-quoted token, and the excepted locations (drafts, example templates), consistent with CON-029.

**Out of scope**
- Minting, promoting, or anchoring ADRs — the decision is explicitly that ADRs are not traceables; this story checks their citations, it does not bring them into the trace graph.
- Resolving the decision-point suffix to a heading within an ADR — resolution stays file-level; sub-file precision is a later option.
- Converting bare ADR citations to links — the check reads the bare token; no authoring change is required.
- Checking non-ADR external references such as URLs or tickets — outside clew's corpus scope.

## Relations

**Realizes** (new specs)

- [CON-036 — Every cited ADR id resolves to an ADR file](../specs/CON-036-cited-adr-id-resolves.md)

**Related**

- Extends the suite stood up by [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](STR-024-clew-check-suite.md) — a new member beside reference-rot.
- The token-resolving sibling of [CON-029 — Every document link resolves to an existing target](../specs/CON-029-document-link-resolves.md): CON-029 resolves markdown links, this resolves bare ADR-id tokens.
- Checks the practice seeded by [SW-045 — Setup seeds the ADR practice with a tool-owned template](../specs/SW-045-setup-seeds-adr-practice.md): setup gives a project ADRs; this keeps their citations honest.
