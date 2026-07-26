**Title**
Generated output is inert to the scan and the checks

**Lens**: CON

**Status**: active

**Description**
The traceables and the anchoring utility a generator emits are **inert** to the code scan and the integrity checks: they contribute no anchor, and they trip no check.
A generator emits a spec id only as an underscore-form symbol name or a string value — never as a hyphenated spec-id token in a comment — and places any anchor-shaped example only inside a comment, never as live code.
So discovery, which reads markers in code and skips comments and strings, finds no anchor in generated output, and the spec-id-in-comment check finds no token.
The property holds wherever the generated files sit, so the tool stays correct without having to hide its own output from the scan.

**Rationale**
The tool's correctness must not rest on remembering to exclude every generated directory; a missed or defaulted output directory would otherwise fabricate anchors no one wrote, or raise violations against tool-owned files.
Making generated output inert moves the guarantee from "the scan happened to skip the right folder" to "generated output cannot pollute a scan, wherever it sits" — a property the generator owns and a test enforces.
This is the invariant that lets the built-in exclusions stop special-casing generator output (CON-016): excluding the output directory becomes an optimization and a user's choice, not a correctness crutch.

**Verification Description**
For each configured generator, generating and then running discovery and the spec-id-in-comment check over the emitted output yields nothing — no anchor and no violation.
A generator that emitted a hyphenated spec-id token in a comment, or an anchor marker as live code, fails this verification.

## Relations

**Concerns**

- [ARCH-003](ARCH-003-generator-interface.md)

**Related**

- Lets [CON-016](CON-016-scan-builtin-exclusions.md) relax its automatic exclusion of generator output: inertness, not hiding, is what keeps the scan faithful.
- Strengthens [CON-012](CON-012-generated-files-tool-owned.md): tool-owned output is not only never hand-edited, it is never mistaken for a use.
