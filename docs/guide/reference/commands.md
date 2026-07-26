# Command reference

Every command operates on the project rooted at the current directory, reading `.clewrc.json` for its lenses and layout.
Every section of that file is documented in the [Configuration reference](configuration.md).
Run `clew <command> --help` for the authoritative, version-specific usage.

In normal use you do not run most of these by hand: clew's **skills** invoke them through your agent as you draft, promote, implement, and anchor (minting ids, generating traceables, binding drafts) — see the [Skill reference](skills.md) for the skills themselves.
You mainly run `clew setup` to bootstrap and `clew coverage` / `clew check` for the assurance view.
The reference below documents every command.

## `clew setup`

Scaffold a runnable configuration and layout.

```bash
clew setup [--generator <type>] [--agent <harness>]
```

- `--generator <type>` — the target generator to configure (for example `typescript`, `java`).
- `--agent <harness>` — the agent harness to emit the method (governance + skills) for (default: `claude`).

Writes `.clewrc.json`, the spec-tree layout, and clew's skills for your agent.
The id state (`.clew/state.json`) is created on the first mint, and the generated-traceables output folder when `clew spec` first runs — not by setup.
A new project is ready to use after this — you do not need `clew reconcile`.
Safe to re-run: it reconciles rather than clobbering files you have edited.

## `clew mint`

Mint ids for a lens.

```bash
clew mint <type> [count] [--tmp] [--as <author>]
```

- `<type>` — the id prefix to mint for (e.g. `SW`).
- `[count]` — how many ids to mint (default `1`).
- `--tmp` — mint temporary, unbound ids that touch no state (for drafts).
- `--as <author>` — namespace temporary ids by author (e.g. `TS`); falls back to the `CLEW_DRAFT_AUTHOR` environment variable.

Bound ids advance the state and are never reused; temporary ids do not.

## `clew spec`

Generate traceables and anchoring utilities from the specs.

```bash
clew spec
```

Reads the corpus and emits one traceable per `active` (and `deprecated`) spec into the generator's output folder, with the marker functions and a generated README.
`planned` specs generate nothing.

## `clew scan`

Scan the code for its anchors and write the locations index.

```bash
clew scan
```

Writes the locations index — a persisted record of where each spec is realized, verified, or concerned.
(`clew coverage` scans on its own, so you do not need to run `scan` before it; the index is for inspection and other tooling.)

## `clew coverage`

Report which specs the code covers.

```bash
clew coverage
```

For each spec, compares the anchors found in code and tests and classifies it: an open gap until it is both realized and verified, done once it is.

## `clew check`

Run the deterministic integrity-check suite over the corpus.

```bash
clew check
```

Runs every integrity check as one suite — for example that no anchor names a spec that no longer exists, and that no spec id appears only in a comment instead of an anchor.

## `clew promote`

Finalize a story (and its specs) into the spec tree.

```bash
clew promote <roots...>
```

- `<roots...>` — the story or spec to promote (a temporary id or a path), or `all` for every pending draft.

Resolves the named roots plus the closure of their temporary references, binds a real id for each, substitutes the ids within the drafts, and moves them into the spec tree.
Refuses a partial promotion.

## `clew config`

Print the project's resolved configuration.

```bash
clew config [--json]
```

- `--json` — emit the resolved configuration as JSON.

## `clew reconcile`

Reconcile the id state with the ids already on disk.

```bash
clew reconcile
```

You rarely need this.
The first mint — run by the promote skill — creates the state for a new project, and the draft and promote skills keep it current as ids are minted.
Reach for `reconcile` only when you suspect the state and the spec files have drifted — for example after importing specs from elsewhere, or if `.clew/state.json` was lost.
It scans the story and spec directories, raises each id's high-water mark to the highest bound id actually present, and **never lowers** one; running it on an in-sync project changes nothing.

## Next

- [Configuration reference](configuration.md) — every field in `.clewrc.json`.
- [Skill reference](skills.md) — the skills that run these commands for you.
