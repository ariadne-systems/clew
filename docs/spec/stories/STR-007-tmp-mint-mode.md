**Title**
Add an unbound `--tmp` mode to `clew mint` for preparing drafts

**Status**: done

**Business Value**
An agent prepares a story and its dependent specs before anyone approves them — sometimes several drafts over hours or days.
Binding real sequential ids that early wastes numbers on drafts that may still change or be rejected.
Unbound temporary ids let preparation happen freely, with real ids minted only at approval.

**Problem / Context**
`clew mint <type> <count>` (STR-005) allocates bound, sequential ids from the StateStore; every mint advances the persisted high-water mark.
There is no way to obtain a working id handle without binding it.
An agent drafting in advance therefore either burns sequential numbers on unapproved work or invents ad-hoc placeholders that collide across independent drafts.

**Solution Approach**
Add a `--tmp` mode (short `-t`) to the existing `mint` command: `clew mint --tmp <type> <count>`.
In this mode the command produces `count` temporary ids of the form `<TYPE>-TMP-<opaque>`, where the opaque suffix is a crypto-random token (SW-005).
Temporary minting touches no state: it opens no StateStore session, takes no lock, and advances no sequence; nothing is bound (CON-007).
Because the suffix is opaque, independently generated temporary ids do not collide, so an agent may prepare many drafts in advance and concurrently without coordination.
`TMP` is a reserved marker: a requested type may not equal it nor contain it as a hyphen-delimited segment, so a type such as `TMP` or `MY-TMP` is rejected at mint time, before any id is produced (CON-008).
This keeps the marker out of the type, so no bound id can ever carry `-TMP-` and every temporary id carries exactly one — the two are therefore always distinguishable and a temporary id parses unambiguously, under any bound scheme present or future.
The reservation is on the type, not on the configured id token pattern, which stays free to match every legitimate id in source.
The requested type is also validated by the same prefix rule as the bound path: a malformed prefix is rejected before any id is produced.
The default `mint` behaviour is unchanged; the flag selects a distinct, stateless code path in core, behind the same command.
Where draft files live, and how temporary ids are later replaced by bound ids at approval, are workflow concerns handled by the drafting skill, not this command.

**Acceptance Criteria**
- `clew mint --tmp SW 3` prints three ids of the form `SW-TMP-<opaque>`, one per line to stdout.
- The opaque suffixes are all distinct within a single call. Cross-call uniqueness follows by construction from the crypto-random token; it is a property of the token, not something a deterministic test asserts by drawing random tokens.
- `--tmp` minting touches no state: no StateStore session, no lock, and no sequence is advanced; the prefix's bound high-water mark is unchanged afterwards.
- `-t` is accepted as the short form of `--tmp`.
- Every temporary id carries exactly one reserved `-TMP-` marker, and no bound id carries it, so the two are always distinguishable.
- A type that uses the reserved marker — equal to it (`TMP`) or containing it as a segment (`MY-TMP`) — is rejected with an explicit error and a non-zero exit, in both the bound and the `--tmp` path, and nothing is produced; a type that merely contains the letters (`TMPX`) is accepted (CON-008).
- A type that is not a valid prefix is rejected with an explicit error and a non-zero exit, in `--tmp` mode as in the bound mode, and nothing is produced.
- Without `--tmp`, the command mints bound sequential ids exactly as before (STR-005).
- Vitest covers: the temporary form and one-per-line output, distinctness of the suffixes within a call, that no sequence is advanced, short-flag equivalence, rejection of a malformed type, and rejection of a type that uses the reserved marker.

**Out of scope**
- The opaque *bound* id strategy (ARCH-001 opaque mode); temporary ids are unbound and are not the opaque mint scheme.
- Substituting temporary ids for bound ids at approval, and where draft artifacts live — workflow concerns for the drafting skill.
- Scanning, the index, and resolution.

## Relations

**Realizes**

- [SW-008](../specs/SW-008-mint-command.md)
- [SW-005](../specs/SW-005-mint-temporary-ids.md)
- [CON-007](../specs/CON-007-temporary-id-unbound.md)
- [CON-008](../specs/CON-008-tmp-marker-reserved.md)

## Changes

- **2026-06-26** — STR-021 supersedes the opaque temporary-id form this story introduced, replacing it with a readable per-author sequence (SW-032, CON-023).
The `--tmp` mode, the `-TMP-` reservation (CON-008), and statelessness (CON-007) are unchanged; only the suffix form is revised.
