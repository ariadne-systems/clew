**Title**
The tool exposes a `config` command that prints the resolved configuration

**Lens**: SW

**Description**
The tool exposes a `config` command, invoked as `ariadne config`, taking no positional arguments and accepting a `--json` flag.
The command carries no resolution logic of its own: it requires a configuration (CON-011), builds the generator registry, and delegates to core to resolve the configuration into a single view, then writes that view to standard output — human-readable by default, and as machine-readable JSON with `--json`.
The resolved view names the lenses, the valid id prefixes, the layout directories and files, and each configured generator with its resolved output directory.
On failure the error goes to standard error and the process exits non-zero, like every command; an unrecognized argument or option is rejected with a non-zero exit.

**Rationale**
The CLI surface — which commands exist and how each is invoked — is a contract that agents and scripts depend on, distinct from what a command computes.
Anchoring the `config` command's shape as its own spec gives that contract a stable id and keeps the command thin: a registration point that resolves nothing itself and dispatches to core.
A `--json` form exists because the command's primary caller is an authoring skill that consumes the resolved view, not only a human reading a table.

**Verification Description**
`ariadne config` is a registered subcommand and runs with no positional arguments.
It prints the resolved configuration — lenses, prefixes, layout, and generators with their resolved output directories — to standard output, and `--json` prints the same view as JSON.
The command performs no resolution itself; it delegates to core and surfaces the result and any error through the standard streams.
An unknown option or an extra argument is rejected with a non-zero exit.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
