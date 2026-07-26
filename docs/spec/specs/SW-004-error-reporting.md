**Title**
Errors are reported with their code

**Lens**: SW

**Status**: active

**Description**
When a command fails, it writes the failure to standard error as `error[<CODE>]: <summary>` and exits with a non-zero status.
It writes nothing to standard output on failure.
The code shown is the code of the underlying typed error, so a consumer can identify the failure programmatically without parsing the message text.
When the failure carries diagnostic context, it is written on following lines in the compiler-diagnostic convention — a `  --> <location>` pointer to where the failure was found, a `  = note: <…>` on what the condition means, and one or more `  = help: <…>` lines naming the concrete fix and any next step (such as running a command that reports the full picture).
Any of these may be absent, so a failure with none renders as the single `error[<CODE>]:` line; the code-carrying first line is unchanged, so it stays the machine-facing signal.

**Rationale**
Agents and CI need to detect a failure and branch on its cause.
A coded, stderr-only, non-zero-exit contract is the machine-facing counterpart to the stdout id contract (SW-003): the code is the durable signal, the message is for humans.

**Verification Description**
A failing command writes a line containing the failure's code to standard error and exits non-zero.
Nothing is written to standard output.
The reported code matches the code carried by the typed error that caused the failure.
A failure carrying a location, note, or help renders each on its own line beneath the summary, in the `-->`/`= note:`/`= help:` form; a failure carrying none renders as the single `error[<CODE>]:` line.

## Relations

**Realizes**

- [SYS-006](SYS-006-diagnostic-clarity.md)

## Changes

- **2026-07-01** — Extended the report to the compiler-diagnostic convention: beyond the `error[<CODE>]: <summary>` line, an optional `--> location` pointer and `= note:` / `= help:` lines carry where the failure is, what it means, and how to fix it.
The code-carrying first line is unchanged, so the machine-facing contract holds; the motivation was making validation failures (invalid status, schema violation, invalid schema, duplicate id, unresolved reference) locatable and actionable rather than a bare coded sentence.
- **2026-07-01** — Allowed more than one `= help:` line.
Scan and promote fail fast on the first bad document, so a per-document validation failure (invalid status, schema violation) now carries a second help line pointing to `clew check`, which aggregates and reports every issue across the corpus at once.
