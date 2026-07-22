**Title**
The generator interface provides the generator's authoring context

**Lens**: ARCH

**Status**: planned

**Description**
The generator interface (ARCH-003) exposes each generator's **authoring context**: the stable conventions an agent needs to anchor code in that target language, independent of any generation having run.
The authoring context states the anchor marker form (the marker syntax and how a spec id is referenced), the code elements an anchor may sit on (for example a function, type, method, field, or package), and the language's anchoring idiom — but not a symbol inventory, which is only known after generation and remains the generated README's job (SW-018, SW-037).
Because the interface owns it, the engine obtains a generator's conventions the moment the generator is selected, through the same narrow interface that binds every generator (ARCH-003), and no caller reaches into a concrete generator for them.

**Rationale**
The anchor form is generator-specific but stable and fully determined once the generator is chosen; the code that must state it to an agent (setup, the skills) is generator-agnostic.
Placing the authoring context behind the generator interface keeps that generator-specific knowledge with the generator that owns it — the same dependency direction ARCH-003 already establishes for generation and discovery — so the agent-facing method and the skills can stay neutral and simply surface whatever the selected generator provides.
The alternative, letting a skill or the engine carry a concrete anchor form, couples generator-agnostic code to one generator's spelling and does not scale as generators are added.

**Verification Description**
The generator interface declares an authoring-context member, and each in-tree generator (TypeScript, Java) returns one without any generation having run.
The returned context states an anchor marker form that matches the anchors that same generator discovers on a scan (ARCH-004): a form the generator documents but the scanner would not recognize is a contradiction the verification rejects.
No code outside the generators names a concrete generator to obtain its authoring context.

## Relations

**Related**

- Extends [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](ARCH-003-generator-interface.md): a third capability on the same narrow interface, beside generation and discovery.
- The form it states is the one the scan recognizes per [ARCH-004 — The generator both generates traceables and discovers their anchors](ARCH-004-generator-discovers-markers.md).
- Surfaced to the project by [SW-TMP-001 — Setup emits the selected generator's authoring context into the method](SW-TMP-001-setup-emits-generator-authoring-context.md).
