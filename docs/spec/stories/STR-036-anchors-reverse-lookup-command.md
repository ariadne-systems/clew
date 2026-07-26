**Title**
The tool resolves spec ids to their anchor sites through an agent-facing `anchors` command

**Business Value**
The lateral scan — from a spec to the *other* sites that anchor it — is how an agent finds the tests and sibling code that share a unit of intent.
clew-context's own step 5 tells the agent to "look up everything that anchors it (the tool's resolver, or grep its traceable)" — but no such resolver exists; the command surface is reconcile / mint / setup / spec / scan / coverage / check / config / promote.
So the agent reads raw `.clew/locations.json` and filters it by hand, and when the index is long the file budget bites and the scan is left half-done — the direct cause of a real lateral-scan miss, where a test that verified the very spec being reshaped went unread.
The consumer here is the context agent, not a person: a command that returns the whole set of requested ids as structured, keyed data — with a machine-readable freshness signal — turns step 5 from a manual read into a single, parseable call.

**Problem / Context**
Nothing in clew reads the locations index back — it is written by `scan` and consumed only by whoever opens the file — so the reverse lookup a lateral scan needs has no command.
That lookup is exactly the capability SYS-007 names ("resolve a spec id to its current location"), still planned.
For an agent, the raw file is doubly wrong: it is a flat list the agent must re-group by id, and it carries no signal of whether it is current, so a read-only reader trusts a stale cache silently.
The command must therefore be a machine interface — output keyed by id, freshness as a field, errors as data — not a human report, and it must answer a whole id set in one pass rather than re-reading the index per id.

**Solution Approach**
Add `clew anchors <id>… [--all] [--relation <relation>]` whose **default output is structured JSON** keyed by id: each id maps to its anchor sites (relation, file, line), read from `locations.json` in one pass, optionally filtered to a relation.
Reading the index is O(index), not O(codebase), and the whole set is answered in one call, so the one expensive scan stays in `clew scan` and the lookup rides on its result at any codebase size.
Freshness is a **field in the output**, not prose: the command asks version control which files changed since the index was written and reports `{ stale, changedFiles, scannedAt }`, so the skill decides programmatically whether to trust a result or run `scan`; where there is no version control it falls back to the index's age.
Errors are structured the same way — no index or no configuration yields a machine-readable error object (directing a human, if one runs it, to `scan` or `setup`, CON-011).
It writes nothing and never rebuilds the index — a pure read path safe for the read-only context agent.

**Acceptance Criteria**
- `clew anchors <id>…` resolves one or more ids in a single call and emits, by default, JSON keyed by id — each id's anchor sites as `{ relation, file, line }`; an id with no anchors maps to an empty list, not an error.
- `--all` resolves every id in the index; `--relation verifies` (or `realizes` / `concerns`) restricts the sites to that relation.
- The output carries a structured freshness object — `stale`, the `changedFiles` since the scan, and `scannedAt` — computed from version control, falling back to index age where version control is absent.
- No index or no configuration yields a structured error object (and a non-zero exit), parseable without reading stderr.
- The command reads the index once, writes nothing, and never rescans the codebase.
- The JSON schema is stable and documented, so a skill can rely on its shape; tests assert it.
- Tests cover multiple ids in one call, `--all`, the relation filter, an id with no anchors, the stale and fresh freshness object (with and without version control), and the no-index / no-config error objects.

**Out of scope**
- Making `clew scan` incremental — git-diffing the changed files and patching the index rather than a full rescan — is the write-side counterpart and its own story; `anchors` reads and reports staleness but never writes.
- A human-formatted rendering — the command is built for the agent; a `--pretty` view for a person is a later convenience, not this story's concern.
- Surfacing the specs *related* to an id — the one-hop relation neighbourhood, the other half of SYS-007; this story does the id→code-sites resolution only.
- Any change to `locations.json` or its shape — this command is its first in-tool reader; the written form is unchanged.

## Relations

**Realizes** (new specs)

- [SW-047](../specs/SW-047-anchors-command.md)

**Related**

- Realizes a piece of [SYS-007](../specs/SYS-007-resolution-and-navigation.md), the planned resolution-and-navigation capability.
- Reads the persisted index written by [SW-023](../specs/SW-023-scan-command.md); the two are the read and write paths over the same file.
- The read-and-report sibling of [SW-029](../specs/SW-029-coverage-command.md).
