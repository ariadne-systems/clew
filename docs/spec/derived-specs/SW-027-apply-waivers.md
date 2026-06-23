**Title**
Reconcile uncovered specs against the committed waiver list

**Lens**: SW

**Description**
A spec that is not Covered but appears in the committed **waiver list** — each entry an id and a reason — is reported as **waived** rather than as an open gap, so the open-gap list converges as gaps are covered or accepted.
A waiver for a Covered spec, or for an unknown id, is reported as a **stale waiver**.

**Rationale**
The waiver list is an asset only if it holds genuine gaps: accepting a spec only when it is waived turns the rest into a reviewed inventory of what is not traced and why.
Surfacing stale waivers keeps that inventory honest.

**Verification Description**
A not-Covered spec with a matching waiver is reported waived, not as an open gap; without one it is an open gap.
A waiver for a Covered spec, or an unknown id, is reported as stale.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
