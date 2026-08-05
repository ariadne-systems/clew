**Title**
Add the `clew mint` command that allocates ids

**Status**: done

**Business Value**
Minting exists in core (STR-004) but nothing reaches it from the command line yet.
This is the first business command — the point at which an agent or a human actually produces ids — and the payoff of the StateStore (STR-003) and the sequential strategy (STR-004).

**Problem / Context**
`@ariadne-thread/core` exposes `mint(type, count)`, but the CLI shell (STR-002) deliberately registers no business command and reserves a single registration point for the first one.
There is no way to mint from the command line, and no defined contract for how minted ids are emitted so that a calling process can capture them.
Minting also accepts any type today: a malformed prefix (lowercase, or longer than the configured id token allows) would yield an id that breaks the pattern scanning, the index, and resolution depend on.

**Solution Approach**
Add the first command at the registration point established by STR-002.
`src/commands/mint.ts` exports `registerMint(program)`; its action stays thin and delegates the work to core's `mint()`, carrying no allocation logic of its own.
The command is `clew mint <type> [count]`, with `count` defaulting to 1.
On success the action prints each returned id on its own line to stdout, in allocation order; on failure it lets the error propagate to the `index.ts` handler, which writes it to stderr and exits non-zero, honouring STR-002's output convention.
Configuration (mode, padding) and the state-file location come from core's own defaults; this story adds no flags to override them.
With opaque configured, the command surfaces core's explicit not-yet-implemented error unchanged.

Type validation is a core id rule, not a command concern, so it lives in `mint()`: before allocating, core validates the requested type against the id token pattern read from `.clewrc.json` and fails fast on a malformed prefix, allocating nothing (CON-005).
The command surfaces that error like any other.
This keeps the rule independent of the caller and the pattern out of the CLI.

This story adds `src/commands/mint.ts` and wires it in one line in `program.ts` — introducing the `commands/` directory foreseen by STR-002 — and adds the type validation in core's `mint()`.

**Acceptance Criteria**
- `clew mint SW` mints one id and prints it to stdout.
- `clew mint SW 3` prints three ids, one per line, in allocation order.
- `count` defaults to 1 when omitted.
- A non-positive or non-integer `count` fails with a message to stderr and a non-zero exit, and mints nothing.
- A type that is not a valid prefix under the configured id token pattern (for example lowercase, or longer than allowed) is rejected before allocation: the command fails with an explicit message to stderr and a non-zero exit, mints nothing, and leaves the high-water mark unchanged.
- The validated pattern is read from `.clewrc.json`; no pattern is hard-coded in the minting code.
- Minted ids go to stdout, one per line; diagnostics and errors go to stderr (STR-002 convention).
- With opaque configured, the command fails with core's explicit message and a non-zero exit.
- The command is registered through the single registration point; the action delegates to core and contains no allocation or validation logic.
- Vitest covers: the default count of 1, multi-id output one-per-line in order, a non-zero exit on an invalid count, and rejection of a malformed type with the high-water mark unchanged.

**Out of scope**
- Flags to override padding, mode, the state file, or the config-file location — a later story if needed.
- Opaque id generation itself (its own story).
- Scanning, the index, and resolution.

## Relations

**Realizes**

- [SW-008](../specs/SW-008-mint-command.md)
- [SW-003](../specs/SW-003-mint-command-output.md)
- [CON-005](../specs/CON-005-id-prefix-must-be-configured.md)
