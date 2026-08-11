**Title**
A spec id appears in code only inside its anchor

**Lens**: CON

**Status**: active

**Description**
A spec id may appear in code only inside an anchor (`realizes` / `verifies` / `concerns`), where the compiler checks it.
A spec id written in a comment or a JSDoc block is forbidden: it is an unchecked copy the compiler and coverage cannot see, so it rots.
The rule is the hyphenated id token; restating a spec's wording without its id is a related but separate, judgment-level concern, not this invariant.

**Rationale**
The anchor is trustworthy precisely because it is the *only* checked reference (SYS-001); a second, unchecked reference in prose reintroduces the silent drift the anchor removes.
One reference, one source of truth.

**Verification Description**
A spec id in a comment is rejected; the same id inside an anchor is accepted.

## Relations

**Realizes**

- [SYS-001](SYS-001-compile-checked-anchoring.md)

## Changes

- **2026-08-05** — Narrowed the forbidden-location examples and the verification to a code comment, dropping "a test or suite name" and "or a name".
The invariant stays "a spec id belongs only inside its anchor"; the mechanically enforced case (SW-033) is the comment, so a spec id in a test or suite name is left to convention (`005`) rather than the `clew check` gate, matching the shipped scope.
