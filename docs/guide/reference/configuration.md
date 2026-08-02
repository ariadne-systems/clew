# Configuration

`.clewrc.json` at the project root is clew's per-project self-description: the lenses you author through, where your artifacts live, which generators run, and which gaps you have deliberately accepted.

Every *optional* value has a documented default, so the file states only what your project changes — a missing section resolves to its default.
One default is worth calling out: `generators` defaults to an empty list, so clew never guesses a project's languages or output locations — nothing is generated until you configure one.
The file itself must exist, though: a command fails with `E_NO_CONFIG` and points you at `clew setup` rather than guessing at a project.

`clew setup` writes a runnable starting point.
`clew config` prints the fully resolved view — every default applied and every derived value computed — with `--json` for tooling.

## `idGeneration`

How ids are formed.

```json
{ "idGeneration": { "mode": "sequential", "padding": 3 } }
```

- `mode` — `sequential` (default) or `opaque`.
- `padding` — the width sequential numbers are zero-padded to. Default `3`, so `SW-001`.

## `lenses`

The spec kinds you author through, and the valid spec prefixes.
Each lens carries an `id` — which is also the prefix of the ids minted for it — and a one-line `description` that tells a drafting agent what the lens means in your project.

```json
{
  "lenses": [
    {
      "id": "SW",
      "description": "Software spec — observable, verifiable behaviour of a component."
    }
  ]
}
```

The default set is six lenses, each carrying the description `clew setup` writes into your `.clewrc.json`:

| Lens | Default description |
| --- | --- |
| `STK` | Stakeholder spec — what a stakeholder needs from the system. |
| `SYS` | System spec — a capability or behaviour at the system level. |
| `SW` | Software spec — observable, verifiable behaviour of a component. |
| `ARCH` | Architecture spec — a structural rule or design decision. |
| `NF` | Non-functional spec — a quality attribute such as performance or security. |
| `CON` | Constraint — an invariant that must always hold. |

They are a starting template, not a fixed vocabulary: rename them, drop the ones you do not need, or add your own.

**Configuring `lenses` replaces the default set; it does not extend it.**
List every lens you want, including the defaults you are keeping.
clew's own configuration does exactly this to add an `ENT` lens for domain entities alongside the six.

## `layout`

Where each kind of artifact lives, and the story prefix.

| Key | Default | Meaning |
| --- | --- | --- |
| `stories.dir` | `docs/spec/stories` | Where stories live |
| `stories.prefix` | `STR` | The story id prefix |
| `specs.dir` | `docs/spec/specs` | Where specs live; their prefixes are the lens ids |
| `drafts.dir` | `docs/spec/drafts` | Where unapproved drafts live, mirroring the spec tree |
| `state.file` | `.clew/state.json` | The id state, committed with the project |

The keys nest — the table's `stories.dir` is `layout.stories.dir` — so the full shape is:

```json
{
  "layout": {
    "stories": { "dir": "docs/spec/stories", "prefix": "STR" },
    "specs": { "dir": "docs/spec/specs" },
    "drafts": { "dir": "docs/spec/drafts" },
    "state": { "file": ".clew/state.json" }
  }
}
```

Each value defaults independently, so you can move one location without restating the rest.

The set of valid id prefixes is **derived, not configured**: it is the lens ids plus the story prefix.

## `schemas`

A per-document-type schema declares the fields a `story` or `spec` must carry and the values they may take — your project's own required fields and enums, on top of the core clew always enforces (the id form, the `**Status**` values, relation links).

```json
{
  "schemas": {
    "story": "docs/spec/schemas/story.schema.yaml",
    "spec": "docs/spec/schemas/spec.schema.yaml"
  }
}
```

clew validates a document against its type's schema **every time it reads one** — while generating traceables (`clew spec`), while promoting a draft, and in `clew check`.
A `fail`-severity violation (a missing required field, a value out of its enum) aborts that command with `E_SCHEMA_VIOLATION`; a `warn` one is only reported by `clew check`.
The schema's own `onError` decides which — it defaults to `warn`.
With no schema configured, only the core above is enforced.

## `generators`

The language generators to run — one or more.
Configure several and each renders the same spec corpus into its own language's traceables, in its own `outputDir`, so a polyglot repository traces, say, TypeScript and Java from one set of specs.
With none configured, nothing is generated.

```json
{
  "generators": [
    "typescript",
    { "type": "java", "outputDir": "src/main/java/acme/traceables" }
  ]
}
```

An entry is either a bare type string or an object with a `type` and an optional `outputDir`, relative to the project root.
Omit `outputDir` and the generator's own default applies:

| Generator `type` | Default `outputDir` |
| --- | --- |
| `typescript` | `src/clew/traceables` |
| `java` | `src/main/java/clew/traceables` |

A configured type that no generator provides fails fast with `E_UNKNOWN_GENERATOR`.

## `generation`

What becomes a traceable, and how the traceables are grouped — filters over the **spec corpus** (your stories and specs), matched against a spec's filename.
A spec filtered out here generates no traceable, so no code can anchor it.

### `generation.sets`

Named groupings of traceables — clew generates one symbol set per spec set.

```json
{
  "generation": {
    "sets": [
      { "name": "Core", "pattern": "^(SW|CON)-" },
      { "name": "Rest", "catchAll": true }
    ]
  }
}
```

Each entry has a `name` and either a `pattern` — a regular expression over the spec's **filename** — or `catchAll: true`.

The sets **partition** the specs: each spec must land in exactly one.
A spec whose filename matches two or more sets is an error (`E_SPEC_SET_OVERLAP`) — clew does not silently pick the first, it refuses the ambiguity.
A spec that matches no set is an error too (`E_SPEC_SET_UNMATCHED`), unless a `catchAll` set is configured to collect it, or a `generation.ignore` pattern excludes it.
So order does not decide anything, and a set nothing matches is simply omitted from the output.
With none configured, the default applies: one set per lens — every spec matches exactly one, by its prefix.

### `generation.ignore`

Which specs stay out of generation entirely — regular expressions over a spec's **filename**.

```json
{ "generation": { "ignore": ["^SW-999-"] } }
```

A matching spec is excluded from every spec set and generates no traceable.
No traceable means no symbol to anchor, so an ignored spec sits outside coverage altogether.
In generation and coverage this *resembles* `Status: planned` — no traceable, outside the coverage result — but the two are not the same: `planned` is the spec's own lifecycle state, while `ignore` is a corpus-level override that can make an otherwise `active` spec vanish from view.

Reach for it only when the spec's own status cannot say it: a corpus you do not author, imported or mirrored, where you cannot set `Status` yourself.
For your own specs, `Status: planned` is the finer tool.

## `scan`

Which paths the **code scan** reads when it looks for anchors — globs, relative to the repository root.
A path filtered out here produces no anchors, so the specs its code implements look uncovered.

```json
{
  "scan": {
    "exclude": ["notes", "vendor/**"],
    "unexclude": ["vendor/keep-me"]
  }
}
```

Each candidate path is decided by precedence:

1. **`scan.exclude`** — your own exclusions win; a match here is never scanned.
2. **`scan.unexclude`** — re-includes a path a built-in default below would otherwise skip.
3. **clew's built-in defaults** — excluded.
4. otherwise — scanned.

So `scan.unexclude` can win a path back from a built-in default, but never override a `scan.exclude` you wrote yourself.
A match on any **ancestor directory** counts, so excluding a directory excludes everything beneath it; a glob that cannot be compiled fails fast, naming the pattern.

clew's built-in defaults, which you never have to list yourself:

| Glob | What it is |
| --- | --- |
| `**/node_modules` | Node dependencies |
| `**/.git`, `**/.svn`, `**/.hg` | Version-control metadata (`.svn` also keeps source copies) |
| `**/dist`, `**/build`, `**/target` | Build output — JS/TS `dist`, Gradle `build`, Maven `target` |
| `**/coverage` | Test-coverage output |
| `.clew` | clew's own state directory |

The set is deliberately narrow — only directories that hold *scannable source that is not the project's own* (a dependency package, a `target/generated-sources/*.java`), which the scan would otherwise read and count.
IDE and OS metadata are left out because no generator reads those files; list one under `scan.exclude` if you want it skipped anyway.

## `waivers`

The committed list of coverage gaps you have deliberately accepted, each with a recorded reason.

```json
{
  "waivers": [
    {
      "pattern": "STK-*",
      "reason": "stakeholder needs are verified by acceptance, not by an automated test"
    },
    {
      "id": "SYS-001",
      "reason": "compile-checked anchoring is enforced by tsc, not by a unit test"
    }
  ]
}
```

Each entry targets exactly one of:

- `id` — an exact spec id;
- `pattern` — a glob over spec ids.

Both forms carry a `reason`, which the coverage report prints alongside the waived spec.

**A waiver only ever excuses a missing test.**
It applies solely to a spec that is *realized but not verified*.
A spec with **no realizing anchor can never be waived** — a real gap cannot be configured away.

A waiver that matches no realized spec is reported as a **stale waiver**, so the list cannot rot unnoticed.

## `agent`

Your agent's locations for clew's method — a `type` label naming the agent, the skills directory, the governance directory, and the entry file that loads the governance. clew names no target agent; these are data, and `type` is a label the engine never branches on.

```json
{
  "agent": {
    "type": "claude",
    "skillsDir": ".claude/skills",
    "governanceDir": ".claude/.ai-project-context",
    "entryFile": "CLAUDE.md"
  }
}
```

Recorded by `clew setup` so that re-running it emits to the same locations.
Defaults to the shipped default (Claude Code's conventions) shown above; a run with no `--type` / `--skills-dir` / `--governance-dir` / `--entry-file` uses it. An older configuration that recorded a bare `agent` string instead resolves to the default, so no migration is needed.

## Validation and errors

clew reads the configuration **leniently**: there is no schema over `.clewrc.json` itself, so an unknown key or an unrecognized entry is ignored rather than rejected.
What it *does* enforce, it enforces with a stable error code:

| Condition | Code |
| --- | --- |
| No `.clewrc.json` at the project root | `E_NO_CONFIG` |
| A `generators` type no generator provides | `E_UNKNOWN_GENERATOR` |
| A spec matching more than one `generation.sets` set | `E_SPEC_SET_OVERLAP` |
| A spec matching no set and no `catchAll` | `E_SPEC_SET_UNMATCHED` |
| A `scan` glob that will not compile | `E_INVALID_EXCLUSION_PATTERN` |
| A schema file that is malformed or overreaches the pinned core | `E_INVALID_SCHEMA` |
| A document that violates its schema at `fail` severity | `E_SCHEMA_VIOLATION` |

What clew does **not** check — so mind these yourself: duplicate lens ids or `generation.sets` names, more than one `catchAll` (the first wins, the rest are inert), and a waiver carrying both `id` and `pattern` (the `id` is used, the `pattern` ignored).

## A representative example

A trimmed configuration showing the sections most projects touch — not clew's full file:

```json
{
  "idGeneration": { "mode": "sequential", "padding": 3 },
  "lenses": [
    { "id": "SW", "description": "Software spec — observable, verifiable behaviour of a component." },
    { "id": "CON", "description": "Constraint — an invariant that must always hold." }
  ],
  "generators": [{ "type": "typescript", "outputDir": "packages/trace/src" }],
  "schemas": {
    "story": "docs/spec/schemas/story.schema.yaml",
    "spec": "docs/spec/schemas/spec.schema.yaml"
  },
  "scan": { "exclude": ["notes"] },
  "waivers": [
    {
      "pattern": "STK-*",
      "reason": "stakeholder needs are verified by acceptance, not by an automated test"
    }
  ]
}
```

## Next

- [Command reference](commands.md) — the commands that read this file.
- [Quickstart](../getting-started/quickstart.md) — the loop end to end.
