**Title**
The mint command emits ids to stdout, one per line

**Lens**: SW

**Status**: active

**Description**
When minting succeeds, the `clew mint` command writes each minted id on its own line to standard output, in allocation order, and writes nothing else to stdout.
On failure it writes no id to stdout; the error goes to standard error.

**Rationale**
An agent drives the tool and needs to capture the ids it just minted.
A line-oriented, stdout-only success output is trivially captured and split, and keeping all diagnostics on stderr keeps that stream clean for the caller.

**Verification Description**
Minting N ids prints exactly N lines to stdout, one id per line, in allocation order.
On failure nothing is written to stdout and the error is written to stderr.

## Relations

**Realizes**

- [SYS-005](SYS-005-spec-lifecycle.md)
