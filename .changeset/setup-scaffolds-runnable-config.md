---
"@ariadne-thread/clew": minor
---

`clew setup` now scaffolds a runnable configuration instead of a bare skeleton. It takes `--generator <type>` to select and write the target generator (so `clew spec` produces output with no hand-edit; an unknown generator is rejected), scaffolds the default story/spec document schemas and wires the `schemas` section, writes a default `STK-*` coverage waiver so the first `clew check` is honest, and appends the tool's regenerated output to `.gitignore` while keeping `state.json` tracked. Existing configurations, schema files, and `.gitignore` content are never overwritten.
