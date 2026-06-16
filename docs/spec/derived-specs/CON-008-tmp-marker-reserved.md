**Title**
The `-TMP-` marker is reserved and a type may not use it

**Type**: CON

**Description**
`TMP` is a reserved marker: it is the infix that separates a temporary id's prefix from its opaque suffix (`<TYPE>-TMP-<opaque>`).
A requested type may not equal the reserved marker, nor contain it as a hyphen-delimited segment.
A type such as `TMP` or `MY-TMP` is rejected at mint time — in both the bound and the temporary path — with an explicit error and a non-zero exit, before any id is produced.
A type that merely contains the letters, such as `TMPX`, is not reserved; only a whole `-`-delimited segment equal to the marker is.
The reservation is on the type, not on the configured id token pattern; the pattern is the recognizer for ids in source and is left unrestricted.

**Rationale**
A temporary id must be unmistakably *not* a bound id, in both directions.
If a type could be `MY-TMP`, its bound id would be `MY-TMP-001` — which carries the `-TMP-` marker and would be misread as a temporary id; and its temporary id would be `MY-TMP-TMP-<opaque>`, which cannot be parsed back into prefix and suffix unambiguously.
Reserving the marker on the type closes both: no bound id can ever carry the marker, and every temporary id carries exactly one, so the two are always distinguishable and a temporary id parses unambiguously.
Enforcing this on the type — rather than by constraining the id token pattern — keeps the recognizer free to match every legitimate id, which is its purpose.

**Verification Description**
Minting a type equal to the reserved marker (`TMP`), or one containing it as a segment (`MY-TMP`), is rejected with an explicit error and a non-zero exit, in both the bound and the temporary path, and no id is produced.
A type that merely contains the letters but not as a whole segment (`TMPX`) is accepted.
No bound id produced for an accepted type carries the `-TMP-` marker.

## Relations

**Concerns**

- [ENT-001 — AriadneState](../domain-model.md#ent-001-ariadnestate)
