**Title**
clew reports a spec id found in a code comment

**Lens**: SW

**Description**
clew shall scan source files and report each spec-id token — the hyphenated form a spec is named by, e.g. `SW-032` — that appears in a comment or a test or suite name rather than inside an anchor, emitting the file and line and exiting non-zero when any is found.
The anchor symbol's underscore form (`SW_032_…`) is not a match, so a correctly anchored reference is never reported.
Recognizing what is a comment is language-aware, delegated per language as anchor scanning is (SYS-002), not baked into the core.

**Rationale**
A mechanical, on-every-change check is what makes the rule hold; a documented convention alone does not, because the habit recurs even when the author knows it.
Reusing the existing enforcement path keeps the check where every other gate already runs.

**Verification Description**
A file whose only reference is an anchor passes; a file with a spec id in a line comment, in a JSDoc block, or in a test name is reported with its location and fails the check; the underscore anchor form in code is never reported.

## Relations

**Realizes**

- [SYS-014 — The system detects a spec reference that bypasses the anchor](SYS-014-detect-references-bypassing-anchor.md)

**Related**

- Enforces [CON-026 — A spec id appears in code only inside its anchor](CON-026-spec-id-only-in-anchor.md) — this check is how the invariant is held.
