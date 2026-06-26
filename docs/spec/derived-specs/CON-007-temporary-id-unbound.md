**Title**
A temporary id is unbound and consumes no sequence number

**Lens**: CON

**Status**: active

**Description**
Producing a temporary id touches no persistent state: it opens no StateStore session, takes no lock, and does not advance any prefix's high-water mark.
It may read configuration to validate the requested prefix, but configuration is not state.
A temporary id is therefore never bound — it reserves nothing and can be generated in advance, repeatedly, and concurrently, with no effect on later bound minting.

**Rationale**
The point of a temporary id is preparation without commitment.
If temporary generation advanced the sequence or held the lock, it would bind numbers to unapproved drafts and serialize work that should be free and offline — defeating its purpose.
Keeping it stateless is also what makes independent drafts safe to create at any time.

**Verification Description**
After any number of temporary mints for a prefix, the prefix's persisted high-water mark is unchanged, and a subsequent bound mint continues exactly where it would have without them.
Temporary generation acquires no lock and writes no state file.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)

## Changes

- **2026-06-26** — STR-021 honours this invariant: the per-author next-number scan it introduces (SW-032) is a *read* of the drafts location, not a state write, and the draft counter is not the bound high-water mark.
The statelessness here is unchanged.
