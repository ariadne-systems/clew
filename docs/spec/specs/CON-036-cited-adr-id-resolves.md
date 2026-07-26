**Title**
Every cited ADR id resolves to an ADR file

**Lens**: CON

**Description**
Every `ADR-NNNN` id cited anywhere in the corpus resolves to a file in the layout's ADR directory; a citation that resolves to no file is reported with its location.
The decision-point suffix — an `ADR-0005 D6` names a decision within an ADR — is informational; resolution is file-level.
ADRs are referenced documentation, not traceables: they generate no traceable, are never anchored by code, and stay outside the coverage universe — so this invariant is reference integrity, not coverage.
The check is a sibling of reference-rot: reference-rot resolves markdown links and includes, this resolves bare ADR-id tokens, because an ADR citation is a prose token, not a link.
The **drafts** location and the scaffolded **example templates** (`*.example.md`) are excepted, as they are for CON-029.
A token quoted inside an inline- or fenced-code span is an example, not a citation, and is not flagged — the same link-identification reference-rot and the id-only check use, so a spec may show the form it governs.

**Rationale**
ADRs are the durable *why* behind the ARCH and CON specs, cited from Rationale throughout; a citation of an ADR that was renamed or never added dangles silently — exactly the rot the tool fights, on the spec-to-ADR edge reference-rot cannot see, since it resolves links and an ADR citation is a bare token.
Checking the token's existence closes that edge without making ADRs traceables: code never anchors an ADR, so bringing them into the coverage universe would only create uncoverable members — reference integrity is what they actually need.

**Verification Description**
A cited `ADR-NNNN` that has a file in the layout's ADR directory is accepted; one with no file is reported with its location.
The decision-point suffix is not required to resolve.
A citation inside the drafts location, a scaffolded example template (`*.example.md`), or an excluded path is not reported.
A token quoted inside an inline- or fenced-code span is not reported.

## Relations

**Realizes**

- [SYS-003 — The system allocates unique, stable, persistent spec ids](SYS-003-stable-spec-identity.md)

**Related**

- The token-resolving sibling of [CON-029 — Every document link resolves to an existing target](CON-029-document-link-resolves.md): CON-029 resolves markdown links and includes; this resolves bare ADR-id tokens.
- Runs as a member of the suite in [STR-024 — The tool runs its deterministic integrity checks as one `clew check` command](../stories/STR-024-clew-check-suite.md).
- Keeps honest the citations to the ADRs seeded by [SW-045 — Setup seeds the ADR practice with a tool-owned template](SW-045-setup-seeds-adr-practice.md).
