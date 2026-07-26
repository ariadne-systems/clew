**Title**
Setup never overwrites an existing configuration

**Lens**: CON

**Status**: active

**Description**
`setup` never overwrites content an existing `.clewrc.json` already configures.
A plain re-run (`clew setup`) makes no change to the file and reports that a configuration is present.
The single exception is additive: `clew setup --generator <type>` on an existing configuration fills a `generators` section that is absent or empty, so a project scaffolded without a generator can add one.
A `generators` that already names a generator is left exactly as it is, `--generator` is then reported as ignored, and no other section is ever touched.

**Rationale**
The configuration is hand-editable and version-controlled; clobbering a customized configuration would destroy the project's deliberate choices.
Setup must therefore be safe to re-run, scaffolding only what is missing rather than resetting what exists — including filling an unconfigured generator, otherwise the one gap a re-run cannot close (SW-039), while still never replacing a choice already made.

**Verification Description**
Given an existing `.clewrc.json` with a populated `generators` — or any re-run with no `--generator` — setup leaves the file unchanged and reports that a configuration already exists.
Given an existing configuration whose `generators` is empty, `setup --generator <type>` writes that one generator into it and changes nothing else.
Scaffolding a fresh configuration proceeds only when no configuration file is present.

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)
