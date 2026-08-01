**Title**
The tool exposes a `coverage` command that reports coverage

**Lens**: SW

**Status**: active

**Description**
`clew coverage` runs the coverage computation, reports the result, and writes `coverage.json`.
It assembles the universe by reading the generated traceables back through the configured generators (ARCH-004, CON-020) — not by re-scanning the spec files — pairs them with the code anchors from the code scan, and delegates to the core to classify and reconcile.
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

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)

**Related**

- [SW-051](SW-051-coverage-reports-named-specs.md) — adds a read-only per-spec query form; the `coverage.json` write named here is the bare command's

## Changes

- **2026-06-26** — The command now assembles the coverage universe by reading the generated traceables back through the generators (ARCH-004, CON-020) instead of re-scanning the spec files.
It stays thin; only where the universe comes from changed.

- **2026-08-01** — Noted the read-only per-spec query form (SW-051): `clew coverage <ids>` reports the named specs without writing, so the "writes `coverage.json`" here describes the bare `clew coverage`.
