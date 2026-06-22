**Title**
Mint ids in sequential mode

**Lens**: SW

**Description**
In sequential mode, minting for a prefix produces ids of the form `<PREFIX>-<number>`.
The numbers are obtained from the sequence allocator and rendered with the configured padding.
Minting a count of N yields N ids for the prefix.

**Rationale**
This is the readable sequential id scheme, suited to solo or low-contention repositories where a running number is preferable to an opaque suffix.

**Verification Description**
Minting prefix SW with a count of 3 from a fresh state yields SW-001, SW-002, SW-003 at the default padding of 3.
The underlying numbers come from the allocator and are never reused.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)

**Realizes**

- [SYS-003 — Stable spec identity](SYS-003-stable-spec-identity.md)
