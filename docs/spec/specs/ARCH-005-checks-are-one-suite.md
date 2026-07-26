**Title**
Deterministic integrity checks are one shipped `clew check` suite

**Lens**: ARCH

**Status**: active

**Description**
Every deterministic check over the corpus or the anchors is a member of a single `clew check` suite shipped with the tool — not a separate top-level command, and not a repo-local script.
Adding a check means adding a module to the suite; the command surface stays one verb.
A consumer project inherits every check by running `clew check`, with nothing to copy into its own repo.

**Rationale**
The checks share one purpose (fail fast on a corpus or anchor defect), one execution context (pre-commit / CI), and one audience (any agent or contributor).
Splitting them into separate commands, or leaving them as repo-local scripts, fragments that surface and strands the portability that is the point — a project adopting clew should get the integrity checks the way it gets minting or coverage.
Keeping them one suite also keeps the determinism in the tool rather than in agent prose.

**Verification Description**
The integrity checks are reachable through the one `clew check` command; a newly added check appears there rather than as a new top-level command or a repo-local check script.

## Relations

**Related**

- Realized by [SW-034](SW-034-check-command.md).
- Serves [STK-002](STK-002-audit-evidence.md).
