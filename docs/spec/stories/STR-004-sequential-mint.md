**Title**
Mint sequential ids using the state store

**Business Value**
This turns the state into the ids the agent actually uses, in the readable sequential scheme suited to solo or low-contention work.
It is the first time the tool produces a real id.

**Problem / Context**
The StateStore (STR-003) holds the `sequences` section, but nothing allocates the next numbers for a prefix or turns a number into an id like `STR-002`, and there is no seam for choosing between the sequential and the future opaque scheme.

**Solution Approach**
Add `mint(type, count)` in `@ariadne-thread/core` behind a small strategy interface.
The sequential strategy opens a StateStore session, allocates the next `count` numbers for the prefix from the `sequences` section of AriadneState — creating the prefix at 1 on first use and advancing its high-water mark — and saves before returning anything.
Only after the save succeeds does it format each number as `<PREFIX>-<zero-padded number>`, with the padding width read from `.ariadnerc.json` (for example `"idGeneration": { "mode": "sequential", "padding": 3 }`).
If the state cannot be saved, the mint fails and returns no ids, leaving the high-water mark unchanged.
Configuration selects the strategy; opaque is recognised but stubbed (it fails with a clear message) until its own story.
The minting code depends on the strategy interface, never on a concrete scheme.

**Acceptance Criteria**
- Allocating a count of N for a fresh prefix yields the numbers 1..N and advances its high-water mark; a later allocation continues after it; an unseen prefix is created automatically.
- `mint("SW", 3)` on a fresh prefix returns `SW-001`, `SW-002`, `SW-003` at the default padding of 3.
- The numbers come from the `sequences` section of AriadneState and are never reused.
- The padding width is read from `.ariadnerc.json`; changing it changes the rendering; no width is hard-coded.
- The strategy is selected by configuration, and the minting code references no concrete strategy.
- Opaque mode is recognised but not implemented — it fails with a clear, explicit message.
- If the state cannot be saved, the mint fails and returns no ids, and the persisted high-water mark is unchanged.
- Vitest covers allocation (fresh, continue, auto-create), formatting, padding, batch minting, strategy selection, and the save-failure case.

**Out of scope**
- The `ariadne mint` CLI command (its own story).
- Opaque id generation, scanning, the index, and resolution.

## Relations

**Realizes**

- [SW-001 — Allocate consecutive sequence numbers for a prefix](../derived-specs/SW-001-allocate-sequence-numbers.md)
- [CON-002 — A sequence number is never reused](../derived-specs/CON-002-sequence-number-never-reused.md)
- [CON-004 — Ids are returned only after the allocation is persisted](../derived-specs/CON-004-ids-returned-only-after-persist.md)
- [SW-002 — Mint ids in sequential mode](../derived-specs/SW-002-mint-sequential-ids.md)
- [CON-003 — The numeric padding is configured in .ariadnerc.json](../derived-specs/CON-003-padding-configured.md)
- [ARCH-001 — Id generation is a config-selected, pluggable strategy](../derived-specs/ARCH-001-pluggable-id-strategy.md)

**Reads**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
