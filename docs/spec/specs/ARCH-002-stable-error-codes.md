**Title**
Errors are identified by a stable, typed code

**Lens**: ARCH

**Status**: active

**Description**
A failure is represented by a typed error that carries a machine-readable code in addition to its human-readable message.
Domain errors originate in the core and carry their code; how a code is surfaced to a consumer is a presentation concern (SW-004).
The code is the stable identity of the failure; the message may be reworded freely.
Codes are mnemonic strings and are introduced only as real error conditions arise, not as an upfront taxonomy.

**Rationale**
The tool is consumed programmatically and is open-sourced, so message text cannot be a reliable contract.
A stable code lets automation branch on the cause and lets the wording improve without breaking consumers.
Keeping the code on a typed error, owned by the core, gives one source of truth that every layer renders consistently.

**Verification Description**
A failing operation produces a typed error whose code identifies the cause.
Rewording the message does not change the code.

## Relations

**Realizes**

- [SYS-006](SYS-006-diagnostic-clarity.md)
