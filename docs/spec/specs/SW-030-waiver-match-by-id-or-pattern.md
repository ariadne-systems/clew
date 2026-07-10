**Title**
A waiver matches specs by id or glob pattern and waives a missing test

**Lens**: SW

**Status**: active

**Description**
A waiver entry targets a spec **id** or a **pattern** — a glob over spec ids.
A waiver waives the **verify** requirement only: it marks a not-Covered spec **waived** when the spec is missing exactly its test — implemented but unverified (`Realized`).
A spec missing its realizing code — `None`, or the rare verify-only — is never waived and stays an open gap.

**Rationale**
Matching by pattern accepts a structurally-untestable class — a lens with no honest test — in one reviewed entry instead of one waiver per id.
Waiving only a missing test keeps the waiver from suppressing the report's strongest signal: a spec with no thread to code at all can never be hidden (CON-021).

**Verification Description**
A pattern waives every matching `Realized` spec and leaves a matching `None` spec an open gap; an id waiver waives the `Realized` spec it names.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-012 — Coverage policy and waivers](SYS-012-coverage-policy-and-waivers.md)
