**Title**
Scaffold the default configuration and layout

**Lens**: SW

**Status**: active

**Description**
Scaffolding writes `.clewrc.json` populated with the default lenses and the default layout (ENT-002), and creates the configured layout directories.
It returns what it created — the configuration path and the directories — so the command can report it.
The written configuration is the opinionated template (ADR-0001 D8): a valid, complete starting point the project then edits.

**Rationale**
The defaults otherwise live only in the tool's code, where a project cannot see or change them.
Writing them out makes the standards visible and editable, and gives the project a single configuration file to own from the start.

**Verification Description**
Scaffolding into a project with no configuration writes `.clewrc.json` containing the default lenses and layout, and the configured layout directories exist afterward.
The written configuration is valid: minting a default lens against it succeeds, and reading the layout from it yields the configured directories.

## Relations

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)
