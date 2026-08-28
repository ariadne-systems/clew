**Title**
The tool exposes an `export` command that builds the trace model and runs the configured emitters

**Lens**: SW

**Status**: planned

**Description**
`clew export` assembles the tool-neutral trace model once — from the generated traceables, the code anchors, the reconciled coverage, and each spec's scanned statement and relations — and hands it to every emitter listed in the configuration's `emitters` section, writing each emitter's output atomically to its resolved path (the configured `output`, or the emitter's default).
An absent or empty `emitters` section writes nothing and is not an error.
A configured emitter that is not registered fails fast with a stable error code that names it, the same shape as an unregistered generator.
The command reads the corpus and writes only the emitters' outputs; it does not regenerate traceables or rewrite coverage.

**Rationale**
One command builds the model and drives the emitters so the model is assembled once and every configured format renders the same state (ARCH-009).
Making activation an opt-in configuration list keeps export off by default — a project pays for it only when it wants cross-tool output — and makes adding a format a configuration change, not a code change.
Failing fast on an unknown emitter surfaces a misconfiguration at the command rather than silently emitting nothing.

**Verification Description**
`clew export` with a configured trace-manifest emitter writes its manifest to the resolved path; with no `emitters` section it writes nothing and exits zero.
A configured but unregistered emitter yields a stable error code naming it and a non-zero exit.
The command writes only emitter outputs — coverage.json and the generated traceables are untouched.

## Relations

**Realizes**

- [SYS-016](SYS-016-cross-tool-trace-export.md)

**Related**

- Runs the emitters defined by [ARCH-009](ARCH-009-pluggable-export-emitters.md).
- Reads the coverage result emitted by [SW-028](SW-028-emit-coverage-result.md), the anchors from [SW-022](SW-022-scan-code-into-anchor-locations.md), and the statements and relations from [SW-054](SW-054-scan-statement-and-relations.md).
- The read-and-report sibling of the [SW-047](SW-047-anchors-command.md) and coverage commands.
