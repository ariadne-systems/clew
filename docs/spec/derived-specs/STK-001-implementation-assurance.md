**Title**
A stakeholder needs assurance that every spec is implemented and tested, with drift caught automatically

**Lens**: STK

**Status**: active

**Description**
A developer needs confidence that every spec the project commits to is actually implemented and tested — and that this stays true as the code changes.
A spec that is dropped, half-built, or quietly diverges from its implementation should be surfaced automatically, not discovered in an audit or an incident.

**Rationale**
Spec drift is silent and expensive; the value of a spec is lost the moment the code stops matching it without anyone noticing.
Catching that gap mechanically, on every change, is the core reason the tool exists.

**Verification Description**
Satisfied when the system makes an unimplemented or untested spec visible without manual cross-checking — realized through compile-checked anchoring (SYS-001) and reverse traceability and coverage (SYS-002).
