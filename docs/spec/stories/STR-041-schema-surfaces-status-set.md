**Title**
A scaffolded document schema surfaces the Status field and its value set

**Status**: planned

**Business Value**
An adopter reads the document schema to learn the contract a story or spec must meet.
Today `**Status**` — a field every document carries and clew validates — is absent from the schema, so the schema looks incomplete and the reader must learn Status from clew's code or a comment that apologises for the omission.
Surfacing it makes the schema the complete, self-documenting contract it should be, and lowers the friction of authoring against it.

**Problem / Context**
clew owns the Status value set: it drives traceable generation (an `active` spec generates a traceable, a `planned` one does not) and the set differs by document type — a story's is `planned | active | done | dropped`, a spec's is `planned | active | deprecated`.
Because the set is clew's, CON-032 today rejects *any* `enum` on Status, and the scaffold omits the Status field entirely, defending the omission with a schema comment ("so Status is not listed here").
The result is a schema that hides a field it enforces — a legibility gap — and a comment that rationalises an incomplete artifact.
The value set must stay clew's; the goal is to surface it, not to hand it to the project.

**Solution Approach**
Surface the pinned Status set in the schema instead of hiding it, while it remains clew's.
The scaffolded story and spec schemas list the `Status` field with its per-type value-set `enum`.
clew accepts a project schema whose `Status` enum *matches* its document type's core set, and rejects one that *diverges* (a missing, extra, or renamed value) — a change from "reject any Status enum" to "reject only a divergent one".
Presence in the schema is documentation clew verifies; divergence from the core is still refused, so a project still cannot redefine the values.
The id form stays clew-owned and un-restated; only Status is surfaced.

**Acceptance Criteria**
- The scaffolded story schema lists `Status` with the enum `planned, active, done, dropped`; the scaffolded spec schema lists `Status` with `planned, active, deprecated`.
- A project schema whose `Status` enum matches its document type's core value set is accepted; one whose `Status` enum diverges (missing, extra, or renamed value) is rejected, naming the schema.
- A schema that tries to redefine the id form is still rejected — the id form is not surfaced.
- The scaffolded schema comment no longer states that Status is omitted; it states the Status set is clew's and that a restated enum must match it.
- A document with an in-set Status still validates and an out-of-set Status is still rejected (validation behaviour unchanged); Status stays optional, absent still meaning `planned`.

**Out of scope**
- Making Status a required field: it stays optional, and the born-status default (absent → `planned`) is unchanged.
- Retrofitting existing stories and specs that omit the Status field.
- Surfacing the id form in the schema — only the Status set is surfaced.

## Relations

**Realizes**

- [CON-032](../specs/CON-032-validate-schema-before-use.md) — revised: a schema may restate the Status value set if it matches, else it is rejected
- [SW-040](../specs/SW-040-setup-scaffolds-schemas.md) — revised: the scaffolded schema surfaces the Status field and its per-type value set

**Related**

- [ARCH-007](../specs/ARCH-007-schema-core-is-what-clew-reads.md) — the pinned-core/project split this refines; the core stays clew's, now surfaced rather than hidden
- [CON-022](../specs/CON-022-valid-status.md) — the spec value set the scaffolded spec schema now writes as an enum
- [CON-041](../specs/CON-041-story-status-terminal-states.md) — the story value set the scaffolded story schema now writes as an enum
- [SW-036](../specs/SW-036-scan-validates-schema.md) — validates each document against the schema whose Status field is now surfaced
