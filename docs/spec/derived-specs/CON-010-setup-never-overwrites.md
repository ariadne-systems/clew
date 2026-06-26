**Title**
Setup never overwrites an existing configuration

**Lens**: CON

**Status**: active

**Description**
If `.ariadnerc.json` already exists, `setup` makes no change to it and reports that a configuration is present.
Only an absent configuration is written; an existing one — default or customized — is left exactly as it is.

**Rationale**
The configuration is hand-editable and version-controlled; clobbering a customized configuration would destroy the project's deliberate choices.
Setup must therefore be safe to re-run, scaffolding only what is missing rather than resetting what exists.

**Verification Description**
Given an existing `.ariadnerc.json` — including one a project has customized — setup leaves the file byte-for-byte unchanged and reports that a configuration already exists.
Scaffolding proceeds only when no configuration file is present.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
