**Title**
Promotion reports the drafts it leaves behind

**Lens**: CON

**Description**
After `clew promote` finalizes a story and its reference closure, it reports any files still remaining under the drafts location — drafts it did not promote.
Promotion already refuses a partial promotion of a story's own references (CON-028); this closes the other side: a draft it was never asked to promote, sitting in the drafts location, is named rather than left silently behind.
The report is informational — it lists what remains; it does not act on it.

**Rationale**
Promotion moves a named set and its closure; a draft outside that set — an ADR draft, a spec for a later story — stays in the drafts location and is easy to forget, as one was.
Naming what remains after a promotion makes the drafts location's state visible at the moment it changes, so nothing is silently stranded.

**Verification Description**
After promoting a story, a draft file left under the drafts location that was not part of the promoted set is reported; a drafts location empty of remaining files reports nothing left.

## Relations

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)

**Related**

- Complements [CON-028](CON-028-promotion-rooted-at-named-drafts.md) and [CON-024](CON-024-atomic-promotion.md): those govern what a promotion *moves*, this surfaces what it *leaves*.
- Refines the report of [SW-016](SW-016-promote-command.md).
