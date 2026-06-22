**Title**
Errors are reported with their code

**Lens**: SW

**Description**
When a command fails, it writes the failure to standard error as `error[<CODE>]: <message>` and exits with a non-zero status.
It writes nothing to standard output on failure.
The code shown is the code of the underlying typed error, so a consumer can identify the failure programmatically without parsing the message text.

**Rationale**
Agents and CI need to detect a failure and branch on its cause.
A coded, stderr-only, non-zero-exit contract is the machine-facing counterpart to the stdout id contract (SW-003): the code is the durable signal, the message is for humans.

**Verification Description**
A failing command writes a line containing the failure's code to standard error and exits non-zero.
Nothing is written to standard output.
The reported code matches the code carried by the typed error that caused the failure.

## Relations

**Realizes**

- [SYS-006 — Diagnostic clarity](SYS-006-diagnostic-clarity.md)
