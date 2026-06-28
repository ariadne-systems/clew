**Title**
A spec id appears in code only inside its anchor

**Lens**: CON

**Description**
A spec id may appear in code only inside an anchor (`realizes` / `verifies` / `concerns`), where the compiler checks it.
A spec id written anywhere else — a comment, a JSDoc block, a test or suite name — is forbidden: it is an unchecked copy the compiler and coverage cannot see, so it rots.
The rule is the hyphenated id token; restating a spec's wording without its id is a related but separate, judgment-level concern, not this invariant.

**Rationale**
The anchor is trustworthy precisely because it is the *only* checked reference (SYS-001); a second, unchecked reference in prose reintroduces the silent drift the anchor removes.
One reference, one source of truth.

**Verification Description**
A spec id in a comment or a name is rejected; the same id inside an anchor is accepted.

## Relations

**Realizes**

- [SYS-001 — The system anchors code to specs with compile-time-checked references](SYS-001-compile-checked-anchoring.md)
