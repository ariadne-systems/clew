**Title**
A configured schema path may not escape the project root

**Lens**: CON

**Status**: active

**Description**
The path a project configures for a document schema is resolved under the project root; a path that escapes it — a `..`-traversal, or an absolute path resolving outside — is rejected with its location, and the schema file is not read.
A repo's `.clewrc.json` is untrusted input, so a configured path is contained before clew reads the file it names.
This is provenance, not content: CON-032 validates a loaded schema's shape; this bounds where the schema may be loaded from.

**Rationale**
A configured schema path is read from `.clewrc.json`, which a clew invocation does not author or control — a cloned, shared, or generated config could point the schema at a file outside the repository (a `../../secrets` path, or an absolute one).
Reading it would let untrusted configuration pull an out-of-tree file into the tool — an information-disclosure and boundary breach; containing the path keeps clew's reads within the project it was run in.
Rejecting at the path, naming the offending value, keeps the failure close to the mistake.

**Verification Description**
A configured schema path that resolves within the project root is read; one that escapes it — a `..`-traversal, or an absolute path resolving outside the root — is rejected, naming the path, and the file is not read.

## Relations

**Realizes**

- [SYS-004 — The system keeps version-controlled per-project configuration and allocation state](SYS-004-configuration-and-state.md)

**Related**

- The provenance sibling of [CON-032 — A schema is validated against clew's minimum contract before it is used](CON-032-validate-schema-before-use.md): that validates the loaded schema's shape, this bounds where the schema may be loaded from — together they are "safe to use".
- Applies the same repository-root containment as [CON-018 — Exclusion patterns are repository-root-relative globs](CON-018-root-relative-globs.md), to a configured file path rather than a glob.

## Changes

- **2026-07-26** — Set active: anchoring the existing schema-path containment guard (`resolveWithinRoot`), which had shipped unspecced.
A `clew-critique` pass on CON-032 surfaced that "validate a schema before use" covered the schema's shape but not its path.
