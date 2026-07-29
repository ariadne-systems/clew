**Title**
A story's status carries explicit terminal states a spec lacks

**Lens**: CON

**Description**
A story declares its implementation status in a `**Status**` field, one of `planned`, `active`, `done`, or `dropped`, or absent (meaning `planned`).
It carries two terminal states a spec's status does not: `done` (the work is implemented) and `dropped` (the work is abandoned and will not be built).
A spec needs neither — its done-ness comes from coverage, and it retires through `deprecated` — but a story is never a traceable, so an explicit terminal state is the only signal that a story's work is finished or will not be done.
A story's status is informational and gates nothing: it produces no traceable and does not affect coverage.
An unrecognized value is rejected, so a typo cannot misreport whether a story is done.

**Rationale**
A spec's lifecycle ends at coverage (and `deprecated` for retiring), so its status needs neither `done` nor `dropped`; a story has no coverage, so without explicit terminal states nothing distinguishes a finished or abandoned story from one still in progress.
Rejecting an unrecognized value keeps the state trustworthy, exactly as it does for a spec — a silent typo must not let a story read as implemented when it is not.

**Verification Description**
Each of `planned`, `active`, `done`, `dropped`, and an absent field is accepted (absent means `planned`); any other value is rejected with an error.
A story's status produces no traceable and leaves coverage unchanged.

## Relations

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)

**Related**

- Parallels [CON-022](CON-022-valid-status.md) — the same fail-fast rule for a spec, whose value set differs: `planned`/`active`/`deprecated`, with no `done` or `dropped` because coverage carries done and `deprecated` carries retirement.
