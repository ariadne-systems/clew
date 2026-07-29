**Title**
The tool exposes a `clew status` command that lists each story's status

**Lens**: SW

**Description**
The tool exposes a `clew status` command that lists each story with its implementation status — `planned`, `active`, `done`, or `dropped` — so a reader sees at a glance what is planned, in progress, done, or abandoned at the work-item level.
It is deliberately separate from `clew coverage`: coverage reports *verified* code-to-spec anchoring, while a story's status is *declared*, so listing them together would blur a derived truth with a stated intent.
The command is thin: it delegates the read to core and prints the result; a configuration is required, like every command.

**Rationale**
A status field no command shows is invisible.
A dedicated command gives the declared work-item state its own surface — distinct from coverage's verified state — and a natural home for the deferred integrity check (a `done` story whose realized specs are not all Covered) to annotate later, once that check exists.

**Verification Description**
`clew status` is a registered subcommand that lists each story with its status; a story with no `**Status**` is shown as `planned`.
It performs no read logic itself, delegating to core, and surfaces the result and any error through the standard streams.
With no configuration present it directs the user to `setup`.

## Relations

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)

**Related**

- Parallels [SW-016](SW-016-promote-command.md) — a thin command surface over a core behaviour.
- Delegates the read to [SW-049](SW-049-read-story-status.md).
- Requires a configuration like every command ([CON-011](CON-011-command-requires-config.md)).
