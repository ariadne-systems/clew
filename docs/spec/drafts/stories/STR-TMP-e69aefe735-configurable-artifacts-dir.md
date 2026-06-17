**Title**
Make project configuration first-class and the init scan directory configurable

**Business Value**
The tool already reads settings from `.ariadnerc.json`, but the configuration has no spec: its location, shape, and defaults live only in the code.
A concrete gap makes this urgent — `init` hard-codes the directory it scans (`docs/spec`), so a project that keeps its specs elsewhere cannot use it.
Specifying the configuration and sourcing the scan directory from it removes the hard-coded path and gives every current and future option one documented home.

**Problem / Context**
`config.ts` reads the `idGeneration` and `idToken` sections from `.ariadnerc.json` with defaults, but no spec or entity describes the file, so the contract is implicit and the options are scattered across CON-003, CON-005, and ARCH-001.
`init` (STR-008) hard-codes `docs/spec` as its scan root; that location was flagged as the one under-specified point of that story.

**Solution Approach**
Introduce the configuration as a domain entity (ENT-TMP-f0fdcb421a, Configuration) whose attributes are the existing options plus a new `artifacts.dir`, and a software spec (SW-TMP-1d481ff068) that defines how the file is read: a single `.ariadnerc.json` at the project root, every value defaulting when absent, sections independent.
Add the `artifacts.dir` option (default `docs/spec`) and have `init` resolve its scan root from it instead of the hard-coded constant, so behaviour is unchanged by default but a project can point it elsewhere.
Re-point the existing config-touching constraints (CON-003, CON-005) and ARCH-001 to Concern the new entity, consolidating the model.

**Acceptance Criteria**
- A new domain entity, Configuration, lists the configurable options as attributes, each with a documented default.
- A software spec defines that configuration is read from a single `.ariadnerc.json` at the project root, with per-value defaults and independent sections.
- `init` scans the directory given by `artifacts.dir`, defaulting to `docs/spec` when unset, so existing projects are unaffected.
- With `artifacts.dir` set to another path, `init` discovers ids there.
- A project with no `.ariadnerc.json` behaves exactly as today: every value resolves to its default.
- The config-touching constraints (CON-003, CON-005) and ARCH-001 Concern the Configuration entity.
- Vitest covers: the default scan directory, a configured scan directory, and resolution falling back to defaults when the file or the attribute is absent.

**Out of scope**
- New options beyond `artifacts.dir`; the other settings remain as they are.
- A user-facing configuration reference document (a peer of `docs/errors.md`) — worthwhile, but separate.
- Validating the configuration file's schema or reporting unknown keys.

## Relations

**Realizes**

- [SW-TMP-1d481ff068 — The tool reads project configuration from `.ariadnerc.json`](../derived-specs/SW-TMP-1d481ff068-read-configuration.md)
