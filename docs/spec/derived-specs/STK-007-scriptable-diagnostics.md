**Title**
An automation or support stakeholder needs failures to carry stable identities that scripts and docs can rely on

**Lens**: STK

**Description**
A CI user, integrator, or support engineer needs failures to carry stable identities, so automation and documentation can rely on them without parsing message prose.

**Rationale**
Failures consumed by scripts, pipelines, and support runbooks must be recognizable by something that does not change with wording; a stable code is that identity, and is what lets integrations and documentation stay correct across releases.

**Verification Description**
Satisfied when each failure carries a stable, documented code that automation can branch on — realized through diagnostic clarity (SYS-006).
