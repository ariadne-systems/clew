**Title**
Exclusion patterns are repository-root-relative globs

**Lens**: CON

**Status**: active

**Description**
Every exclusion pattern — a built-in default, a user `exclude`, or an `unexclude` — is a glob matched against a path **relative to the project root**, normalized to forward slashes.
A pattern without a leading `**/` matches only at the root: `out` matches `<root>/out` but not `<root>/foo/out`.
A pattern intended to match at any depth uses the `**/` prefix: `**/node_modules`, `**/dist`.
The built-in defaults (CON-016) are expressed as such globs rather than matched by bare directory name.
A pattern matches files and directories alike — `**/*.fixture.ts` a file, `**/node_modules` a directory.
Because matching is on root-relative, forward-slash paths, a pattern behaves identically on Windows and POSIX.
Matching is **case-sensitive** on every platform, so the outcome depends only on the pattern and the path string, never on the host filesystem's case-folding: `out` does not match a path segment `Out`.

**Rationale**
Matching by directory name regardless of position silently drops source directories whose names collide with build-tool conventions — most sharply a hexagonal `adapter/out/` package against an `out/` build directory.
Root-relative globs make the scope of each pattern explicit and predictable, and the `**/` opt-in preserves any-depth matching where it is genuinely wanted (dependency and build directories that recur per module).
Forward-slash normalization, and case-sensitive matching, keep a pattern from behaving differently across platforms — the match is a pure function of pattern and path.
clew cannot know a project's configured build directory — that is a toolchain setting outside `.clewrc.json` (a project's output may be `dist`, `build`, or `lib`) — so the build-output defaults are a small conventional set, each scoped with `**/` where the directory genuinely recurs at any depth (dependencies, per-module build output) or root-only where the bare name commonly collides with source (the `out` case), and all of them overridable by `exclude` and `unexclude`; a project the defaults misjudge corrects them in config rather than being stuck.

**Verification Description**
A bare-segment pattern matches a path only at the root, not the same name nested deeper; a `**/`-prefixed pattern matches at any depth.
A source file under `…/adapter/out/…` is scanned while `<root>/out` is excluded.
The same pattern set excludes the same paths given Windows or POSIX separators, and a pattern `out` does not exclude a path segment `Out` (matching is case-sensitive).

## Relations

**Concerns**

- [ENT-002](../domain-model.md#ent-002-configuration)
