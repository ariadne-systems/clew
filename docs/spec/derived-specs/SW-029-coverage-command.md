**Title**
The tool exposes a `coverage` command that reports coverage

**Lens**: SW

**Description**
`clew coverage` runs the coverage computation, reports the result, and writes `coverage.json`.
It is **informational** — it always exits 0, whether or not gaps exist; turning the report into a pass/fail is the gate, a later story.
It is thin — it delegates to the core — and requires a configuration; with none present it directs the user to `setup` (CON-011).

**Rationale**
A command that computes coverage and writes the shared file makes the result usable and testable on its own, and gives the later gate something to read.
Keeping it thin preserves the rule that the CLI is presentation over a core capability.

**Verification Description**
`clew coverage` reports the result and writes `coverage.json`, and exits 0 even when gaps exist.
With no configuration it directs the user to `setup`.
The command holds no coverage logic of its own.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
