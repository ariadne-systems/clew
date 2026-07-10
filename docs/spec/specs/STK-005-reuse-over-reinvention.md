**Title**
A stakeholder needs existing specs and implementations to be discoverable, so new work builds on what exists rather than reinventing it

**Lens**: STK

**Description**
A developer — and the agent working on their behalf — needs existing specs, services, utilities, and implementations to be discoverable, so that new work builds on what already exists rather than recreating it.

**Rationale**
Reinvention is one of the two failure modes the approach exists to prevent (ADR-0001): the cost is not only duplicated effort but divergent, untraceable copies of the same intent.
Making prior work findable — by id, by relation, and by the code that anchors it — is what lets the next change extend what is there rather than fork it.

**Verification Description**
Satisfied when a spec and its implementation can be located from an id and the related specs surfaced, so existing work is found before new work begins — realized through resolution and navigation (SYS-007).
