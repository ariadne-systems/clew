**Title**
A stakeholder needs a trustworthy, exportable record that specs trace to their implementation and verification

**Lens**: STK

**Description**
An assessor or auditor needs a trustworthy record that each spec traces to the code that implements it and the tests that verify it, in a form an external process can read.

**Rationale**
Regulated and safety-relevant work must demonstrate traceability, not assert it.
A record generated from the actual code — rather than maintained by hand — is the only kind an audit can trust, because it cannot drift from what the code really says.

**Verification Description**
Satisfied when the system can produce a machine-readable trace and coverage record derived from the code (SYS-002), not from a separately maintained document.
