---
"@ariadne-thread/clew": minor
"@ariadne-thread/trace": minor
---

Add configurable scan exclusion — `exclude` and `unexclude` in `.clewrc.json` (STR-017).

The code scan now reads two glob arrays from configuration and applies them alongside the built-in defaults, which become repository-root-relative globs.
A bare segment matches only at the root, a leading `**` matches at any depth, and matching is case-sensitive — so a source directory whose name collides with a build convention is no longer dropped wherever it appears.
Precedence is gitignore-style: a user `exclude` wins, an `unexclude` re-includes a path a built-in default would drop, and a user `exclude` is absolute.
Exclusion is applied during the walk, before discovery, so an excluded file is never read and an excluded directory is pruned — unless an `unexclude` reaches a path beneath it.
Every pattern is compiled up front; an uncompilable `exclude` or `unexclude` glob fails the scan with the new `E_INVALID_EXCLUSION_PATTERN` error rather than silently matching nothing.
