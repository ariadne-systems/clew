**Title**
The tool exposes an `anchors` command that resolves spec ids to their anchor sites

**Lens**: SW

**Description**
`clew anchors <id>…` reads the persisted `locations.json` once and emits, **as structured JSON keyed by id**, the sites anchoring each requested id — each site's relation, file, and line; an id with no anchors maps to an empty list, not an error.
`--all` resolves every id in the index; `--relation <realizes|verifies|concerns>` restricts the sites to one relation.
The output is a machine contract for the context agent, not a human report: alongside the per-id sites it carries a freshness object — `stale`, the `changedFiles` since the scan, and `scannedAt` — computed by asking version control which files changed since the index was written, falling back to the index's age where there is no version control.
No index or no configuration yields a structured error object and a non-zero exit, so the caller parses one thing rather than stdout, stderr, and an exit code.
It reads and filters the index rather than rescanning the code, and answers a whole id set in one invocation, so its cost is the size of the index, not of the codebase, and not multiplied by the number of ids; it writes nothing.

**Rationale**
The reverse lookup from a spec to its anchor sites is what a lateral scan needs, and its consumer is an agent assembling context — so the interface is structured data keyed for direct indexing, with freshness and errors as fields, not prose an agent must reparse.
Resolving the whole set from the index in one pass keeps the lookup cheap enough to serve an entire lateral scan at any codebase size — a rescan per call, or a tree-wide stat to check freshness, would not scale — while consulting version control for the changed set closes the staleness trap a read-only reader otherwise falls into: a mutating `scan` writes the cache, so a reader that cannot see what changed can trust it silently when it is wrong.
Keeping it read-only preserves the read-only context path; the machine-first output inverts the usual human-default deliberately, because the caller is the skill, not a person.

**Verification Description**
`clew anchors <id>…` emits JSON keyed by id, each id's value the list of its anchor sites as `{ relation, file, line }`, read from the index; an id with no anchors maps to an empty list.
`--all` resolves every id; `--relation verifies` restricts the sites to verifying ones.
The output carries a freshness object reporting `stale`, `changedFiles`, and `scannedAt`, computed from version control and falling back to index age without it; no index or no configuration yields a structured error object and a non-zero exit.
The command reads the index once, writes nothing, and does not rescan; the JSON schema is stable.

## Relations

**Realizes**

- [SYS-007](SYS-007-resolution-and-navigation.md)

**Related**

- Reads the persisted index written by [SW-023](SW-023-scan-command.md); the two are the read and write paths over the same file, produced by [SW-022](SW-022-scan-code-into-anchor-locations.md).
- The read-and-report sibling of [SW-029](SW-029-coverage-command.md).
