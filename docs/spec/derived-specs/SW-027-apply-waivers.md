**Title**
Reconcile uncovered specs against the committed waiver list

**Lens**: SW

**Status**: active

**Description**
Reconciles the computed coverage against the committed **waiver list**: a spec that some waiver waives (SW-030) is reported as **waived** rather than as an open gap, so the open-gap list converges as gaps are covered or accepted.
A waiver that waives nothing — it matches no spec it can waive (SW-030) — is reported as a **stale waiver**.

**Rationale**
The waiver list is an asset only if it holds genuine gaps: accepting a spec only when it is waived turns the rest into a reviewed inventory of what is not traced and why.
Surfacing stale waivers keeps that inventory honest.

**Verification Description**
A spec a waiver waives is reported waived, not as an open gap; a spec no waiver waives is an open gap; a stale waiver is reported separately.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)

## Changes

- **2026-06-23** — Narrowed to consume the match rule now defined by SW-030 (STR-019): a waiver matches by id or pattern and waives only a missing test, so what counts as *waived* — and as a *stale waiver* — is SW-030's, no longer "any not-Covered id with a matching entry".
Reconcile and the waived/stale reporting are unchanged in intent; only the match they apply moved out.
