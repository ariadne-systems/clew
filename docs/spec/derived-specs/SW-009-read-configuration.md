**Title**
The tool reads project configuration from `.ariadnerc.json`

**Lens**: SW

**Description**
The tool reads its per-project configuration from a single file, `.ariadnerc.json`, at the project root.
Every configurable value has a documented default; a missing file, a missing section, or a missing attribute resolves to that default.
The sections are independent: an absent or malformed section does not affect the resolution of the others.
No configurable value is hard-coded in the behaviour that consumes it — each is sourced from this file (the shape of the configuration is ENT-002).

**Rationale**
A single, version-controlled configuration file gives the team one place to set how the tool behaves, and keeps that choice out of the code.
Documented defaults mean a project states only what it wants to change, and the tool runs with no configuration file at all.

**Verification Description**
With no `.ariadnerc.json` present, every configured value resolves to its default.
With the file present, a stated value overrides its default and an omitted value keeps it.
A value absent from one section does not change another section's resolution.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
