**Title**
The `-TMP-` marker is reserved and the configured id token pattern must not admit it

**Type**: CON

**Description**
The `-TMP-` infix that separates a temporary id's prefix from its opaque suffix (`<TYPE>-TMP-<opaque>`) is a reserved marker.
The configured id token pattern in `.ariadnerc.json` may never admit an id that carries this marker.
The reservation is enforced when configuration is read: a pattern that would match a temporary id is rejected with an explicit error and a non-zero exit, before any id is minted.
The reservation holds for every bound id scheme, sequential or opaque, present or future.

**Rationale**
A temporary id's purpose is to be unmistakably *not* a bound id.
If that distinction rested only on the default sequential pattern, a later opaque bound scheme — whose pattern would be widened to admit opaque suffixes — could silently start matching `<TYPE>-TMP-<opaque>`, and a temporary id would be mistaken for a bound one.
Reserving the marker and forbidding any configured pattern from admitting it makes the distinction structural rather than contingent on the pattern in force, so it cannot be eroded by configuration.
Rejecting the offending pattern at configuration-read time fails fast, before any id is produced under an unsafe pattern.

**Verification Description**
A configuration whose id token pattern would admit an id carrying the reserved `-TMP-` marker is rejected when configuration is read, with an explicit error and a non-zero exit, and no id is minted.
A configuration whose pattern does not admit the marker is accepted, and minting proceeds normally.
No temporary id matches an accepted configured pattern.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
