**Title**
Add an `ariadne setup` command and require a configuration before minting

**Business Value**
The project configuration is otherwise invisible — its defaults live only in the tool's code — and without an explicit setup the user's very first `mint` commits to a lens set they never chose.
An enforced `setup` makes the first interaction a deliberate moment: the standards are written out to edit, the project chooses its lenses before allocating any id, and a newcomer is oriented — the onboarding step that project tools (git, terraform, npm) all require.

**Problem / Context**
`mint` and `init` work with no configuration (the core readers default, SW-009), so a greenfield project silently runs on defaults: the configurable lenses and layout are never surfaced, and the first ids are minted under the default lens set before the user has a chance to change it.
`init` (STR-008) adopts an *existing* artifact tree; it does not scaffold a new one or guide the choice.

**Solution Approach**
Add `ariadne setup`: it writes `.ariadnerc.json` with the default lenses and layout (ENT-002), creates the configured layout directories, and prints a short confirmation and next steps.
Make a configuration required: `mint` and `init` fail when no `.ariadnerc.json` is present, directing the user to run `ariadne setup` first (CON-011).
`setup` never overwrites an existing configuration (CON-010), so it is safe to re-run — and an adopter runs it, edits the lenses to match their existing prefixes, then `init`.
The requirement is a command-level precondition; the core config readers still default an absent value within a present configuration (SW-009 unchanged). The action is thin and delegates the write to core (SW-011); rich, interactive guidance is the `ariadne-setup` skill's job, not the command's (ADR-0003).

**Affected specs and artifacts**
- New: `SW-010` (setup command surface), `SW-011` (scaffold the default configuration and layout), `CON-010` (setup never overwrites an existing configuration), `CON-011` (a command requires a configuration).
- SW-007 (init command surface) and SW-008 (mint command surface): now require a configuration to be present, failing toward `setup` when it is absent.
- SW-009 (the tool reads project configuration): unchanged at the core level — an absent value within a present configuration still defaults; the command-level requirement is the new precondition, not a change to the readers.
- Code: a new `setup` command and core config scaffolding; a config-presence guard shared by `mint` and `init`; a stable error code for the absent-configuration condition (STR-006).

**Acceptance Criteria**
- `ariadne setup` in a project with no `.ariadnerc.json` writes one containing the default lenses and layout, and creates the configured layout directories.
- The written configuration round-trips: a subsequent `ariadne mint <LENS>` for a default lens succeeds.
- Run where a `.ariadnerc.json` already exists, `setup` leaves the file unchanged and reports that a configuration already exists.
- In a project with no configuration, `ariadne mint` and `ariadne init` fail with an explicit error naming `ariadne setup`, a non-zero exit, and no allocation or change.
- On success `setup` prints a concise summary and next steps to stdout; an unrecognized argument or option is rejected with a non-zero exit.
- Vitest covers: scaffolding into an empty project (config + directories created), the no-overwrite behaviour, the round-trip (mint a default lens after setup), and `mint`/`init` failing toward `setup` when no configuration is present.

**Open decisions** (resolve during refinement)
- The exit code when a configuration already exists on `setup`: `0` (idempotent, like `git init` re-run) or non-zero. Lean `0`.
- Whether `setup` also seeds the StateStore, or leaves that to `init` (lean: leave it to `init` — keep the two commands single-purpose).

**Out of scope**
- Interactive customization of lenses or layout — the `ariadne-setup` skill (ADR-0003).
- Rich onboarding or tutorial output — skill and documentation, not the command.
- Reconciling the StateStore from existing artifacts — that is `init` (STR-008).

## Relations

**Realizes**

- [SW-010 — The tool exposes a `setup` command that delegates to core](../derived-specs/SW-010-setup-command.md)
- [SW-011 — Scaffold the default configuration and layout](../derived-specs/SW-011-scaffold-default-config.md)
- [CON-010 — Setup never overwrites an existing configuration](../derived-specs/CON-010-setup-never-overwrites.md)
- [CON-011 — A command requires a project configuration and directs the user to setup](../derived-specs/CON-011-command-requires-config.md)
