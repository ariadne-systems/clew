**Title**
A stakeholder needs traceability data version-controlled and reviewed alongside the code it describes

**Lens**: STK

**Status**: active

**Description**
A team needs the traceability data — ids, specs, configuration, and allocation state — to be version-controlled and reviewed alongside the code it describes, not held in a separate tool or database that drifts out of sync and out of review.

**Rationale**
When traceability lives beside the code, it moves with branches, merges, and reviews, and a change to a spec is a diff like any other.
A separate system becomes a second source of truth that no one trusts.

**Verification Description**
Satisfied when the project's specs, configuration, and allocation state are plain files under version control — realized through stable spec identity (SYS-003) and project configuration and state (SYS-004).
