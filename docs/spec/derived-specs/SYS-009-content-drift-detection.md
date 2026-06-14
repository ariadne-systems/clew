**Title**
The system detects when anchored code references an outdated version of a spec

**Lens**: SYS

**Description**
The system shall detect when anchored code references an outdated version of a spec — distinguishing a spec that still exists but has changed from one that is merely still referenced.

**Rationale**
Existence and content-currency are different properties (ADR-0001 D1): the compiler catches a reference to a *removed* spec, but not a reference to a spec whose meaning has since changed.
Catching that drift — by comparing against the content the code was anchored to — closes the gap between "the id still resolves" and "the code still matches what the spec now says".
This is a deferred capability (ADR-0005 scope) that rides on the committed index; no implementation is in scope yet.

**Verification Description**
Given a spec whose content changed after code anchored to it, the system flags the anchoring code as referencing an outdated version; an unchanged spec is not flagged.

## Relations

**Realizes**

- [STK-001 — Assurance that every spec is implemented and tested](STK-001-implementation-assurance.md)
