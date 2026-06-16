**Title**
A minted id's prefix must match the configured id token pattern

**Type**: CON

**Description**
Minting validates the requested type against the id token pattern configured in `.ariadnerc.json`.
A type that is not a valid prefix under that pattern — for example a lowercase prefix, or one longer than the pattern allows — is rejected before any number is allocated: the mint fails with an explicit error and allocates nothing.
The pattern is read from configuration and is not hard-coded in the minting code.

**Rationale**
The tool sells id discipline.
Admitting a malformed id would break the very pattern the rest of the system — scanning, the index, resolution — relies on to recognise and link ids.
Rejecting before allocation also avoids burning a sequence number on an invalid request, so a later valid mint is not left with a gap it did not cause.

**Verification Description**
A type that forms a valid prefix under the configured pattern mints normally.
A type that does not (lowercase, or a prefix longer than allowed) is rejected with an explicit error, no id is returned, and the persisted high-water mark is unchanged.
Changing the configured pattern changes what is accepted; no pattern is hard-coded in the minting code.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
