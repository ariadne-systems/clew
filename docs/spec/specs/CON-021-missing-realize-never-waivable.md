**Title**
A waiver never hides a spec that is missing its implementation

**Lens**: CON

**Status**: active

**Description**
A waiver waives the verify requirement only.
A spec missing its realizing code — `None` (no realize, no verify) or verify-only (no realize) — is therefore never marked waived and remains an open gap, whether a waiver names it by id or matches it by pattern.

**Rationale**
A `None` spec — no realizing code and no verifying test — is the strongest signal the report has: a spec with no thread to code at all.
A waiver exists to accept a missing *test*, never missing *code*; bounding it that way means the gaps the report most needs to show can never be waived away, and a pattern over a whole class is safe to use.

**Verification Description**
A waiver matching a `None` spec — by id or by pattern — leaves it an open gap; a waiver waives a spec only when the spec already carries its realizing anchor (`Realized`).

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012](SYS-012-coverage-policy-and-waivers.md)
