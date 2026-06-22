**Title**
Finalize reviewed drafts into the spec tree

**Lens**: SW

**Description**
Finalizing takes the drafts to promote — the pending drafts in the configured drafts location, or the ones named — and, for each:
- binds its id by minting the draft's lens, which is the prefix of the draft's temporary id, in bound (non-temporary) mode, advancing the state (SW-002, CON-002);
- substitutes the resolved temporary id project-wide, replacing every occurrence across the configured spec locations and the drafts location (CON-014);
- moves the draft file into its configured location — a story to `layout.stories.dir`, a derived spec to `layout.derivedSpecs.dir` (ENT-002) — renamed to the bound id.
It returns each temporary-id → bound-id mapping.
Finalizing is the mechanical half of promotion; deciding what a draft means for the corpus — relations, supersession, conflicts — is not part of it, and it does not commit.

**Rationale**
The mechanical steps of promotion are deterministic and identical every time, yet doing them by hand is slow and error-prone — above all the project-wide substitution, where one missed occurrence leaves a dangling temporary reference.
Producing the binding, substitution, and move in the core makes the step repeatable and testable, and lets the promotion workflow keep only the judgment an agent must supply.

**Verification Description**
Given a draft with a temporary id, finalizing mints a bound id for the draft's lens, advancing the state, and renames and moves the draft file to its configured location.
Every occurrence of the temporary id — in the promoted draft, in an already-promoted spec, and in an unpromoted draft — is replaced with the bound id.
The reported mapping pairs each temporary id with its bound id.
Binding follows the same persistence guarantee as minting: an id is reported only after the advance is durably persisted (CON-004).

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-005 — Spec lifecycle](SYS-005-spec-lifecycle.md)
