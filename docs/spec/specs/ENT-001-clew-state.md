**Title**
ClewState — the tool's persistent, version-controlled state

**Lens**: ENT

**Status**: active

**Description**
ClewState is the tool's persistent, version-controlled state for a project.
It is the committed record the tool keeps across invocations and shares with the team through git, analogous to a Terraform state file.
Its shape grows only by adding new sections; existing sections are never changed in place.

| Attribute | Type | Description |
| --- | --- | --- |
| `sequences` | `Map<Prefix, Integer>` | The highest number already allocated for each id prefix. A prefix absent from the map has allocated nothing yet. |

`Prefix` is a `String` id prefix (for example `STR`, `SW`) — a configured prefix: a lens id or the story prefix.

**Rationale**
Pinning the state as an explicit entity fixes the one shape the StateStore persists, and the append-only-sections invariant is what lets the format evolve without a migration: a new capability adds a section, and an older tool preserves sections it does not understand.
Anchoring the code type to this id makes a divergence between the documented shape and the persisted shape a compile-time break rather than a silent drift.

**Verification Description**
The `ClewState` type in the core owns the `sequences` map and carries the anchor to this id; removing or renaming the id fails the type-check.
The StateStore round-trips the entity, preserving sections it does not own.

## Relations

**Related**

- Shown in [the domain-model overview](../domain-model.md) — the entity list and diagram.
