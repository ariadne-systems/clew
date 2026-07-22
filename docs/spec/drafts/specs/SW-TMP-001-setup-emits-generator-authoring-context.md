**Title**
Setup emits the selected generator's authoring context into the method

**Lens**: SW

**Status**: planned

**Description**
When `clew setup --generator <type>` emits the method scaffold through the harness adapter (SW-043, ARCH-008), it obtains the selected generator's authoring context (ARCH-TMP-001) and emits it into the agent's context as part of that method, so the conventions are present the instant setup finishes — before any `clew spec` run.
The emitted authoring context is a method file like the governance baselines: tool-owned and reconciled on a re-run under the same rule (CON-033) — an unedited copy is advanced to the tool's current version, a project-edited one is preserved.
When no generator is selected (setup run without `--generator`), no authoring context is emitted, since there is no generator whose conventions to state.

**Rationale**
The gap this closes is a timing one: the anchor conventions an agent needs are known at installation, but their only authoritative source today — the generated README (SW-018, SW-037) — does not exist until the first generation.
Emitting the authoring context at setup, riding the method emission that already runs there (SW-043), puts the conventions in the agent's hands from the first step, so a fresh project's agent works from stated fact rather than a guess.
Treating it as an ordinary tool-owned method file (CON-033) means it stays current across re-runs without special handling and a project may still adapt it.

**Verification Description**
After `clew setup --generator <type>`, the agent's context contains the selected generator's authoring context, with no `clew spec` having run.
Re-running setup advances an unedited authoring-context file to the tool's current version and leaves a project-edited one unchanged (CON-033).
A setup run with no generator selected emits no authoring-context file.

## Relations

**Realizes**

- [ARCH-TMP-001 — The generator interface provides the generator's authoring context](ARCH-TMP-001-generator-provides-authoring-context.md)

**Concerns**

- [CON-033 — The method scaffold is tool-owned but project-editable](CON-033-method-scaffold-tool-owned.md)

**Related**

- Extends the method emission of [SW-043 — Setup emits the method scaffold through the configured harness adapter](SW-043-setup-emits-method-scaffold.md) through [ARCH-008 — The agent-facing method is emitted through a harness-adapter interface](ARCH-008-method-behind-harness-adapter.md).
- Reads the generator chosen by [SW-039 — Setup selects the target generator and writes it to the configuration](SW-039-setup-selects-generator.md).
- Complements, and does not replace, the post-generation README of [SW-018 — The TypeScript generator emits per-set string enums and an anchoring helper module](SW-018-typescript-output.md) and [SW-037 — The Java generator emits per-set enums and anchors code with generated annotations](SW-037-java-annotation-anchored-output.md).
