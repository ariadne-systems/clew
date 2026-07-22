**Title**
The generator emits its authoring context at installation, so skills stay generator-agnostic

**Business Value**
The skills that touch anchors — `clew-setup`, `clew-anchor`, `clew-implement` — must know the target's **anchor form** (the marker syntax, where an anchor sits) to do their job.
Today that knowledge has no authoritative home until *after* the first `clew spec` run, which emits the generated traceables' README.
Before that — and setup runs before any code is generated — an agent has nothing to consult, so it guesses: a real setup run wrote `clew generate` (there is no such command) and a bare `@Realizes` (the Java form is per spec-set, `@RealizesSw`).
Giving the generator a way to state its own conventions, emitted at installation, removes the guessing at its source and lets every skill stay generator-agnostic instead of carrying a generator's specifics.

**Problem / Context**
The generator already owns this knowledge: each generator emits a README documenting its anchor form (SW-018, SW-037).
But that README is a *post-generation* artifact — it lists the concrete generated symbols, and only exists once `clew spec` has run against a non-empty corpus.
At installation (`clew setup --generator <type>`, SW-039) the generator is *chosen* but has produced nothing, so the form/conventions an agent needs from the very first step are absent.
The workaround — pushing the anchor form into the skills — was rejected: it makes a generator-agnostic skill carry one generator's spelling, and it does not scale past the in-tree generators.
There are two distinct things a generator can tell an agent, conflated today:

- the **form/conventions** — the marker syntax, the elements an anchor may sit on, the generate command — which is stable and fully known the moment the generator is selected;
- the **symbol inventory** — which specs currently generate a traceable — which is only known after generation.

The first belongs at installation; the second is the README, and stays where it is.

**Solution Approach**
Split the two, and emit the form/conventions at installation.

1. **The generator states its authoring context.**
Extend the generator interface (ARCH-003) with a capability that returns the generator's **authoring context**: the anchor marker form, the code elements an anchor may sit on, and how anchoring is worked in that language — the stable, pre-generation conventions, not a symbol inventory.

2. **Setup emits it as part of the method.**
When setup emits the method scaffold through the harness adapter (SW-043, ARCH-008), it asks the selected generator (SW-039) for its authoring context and emits it into the agent's context alongside the governance baselines, tool-owned and reconciled on re-run exactly like the rest of the method (CON-033).
So the moment setup finishes, an agent has authoritative generator conventions to work from — before the first `clew spec`.

3. **The skills reference it generically.**
`clew-setup`, `clew-anchor`, and `clew-implement` stop naming any concrete anchor form and instead point at the emitted generator context, so they hold for any generator.

The post-generation README (SW-018, SW-037) is unchanged: it remains the reference for the concrete symbols once they exist.

**Acceptance Criteria**
- The generator interface exposes a generator's authoring context — the anchor marker form, the anchorable code elements, and the language's anchoring idiom — as stable content available without any prior generation.
- `clew setup --generator <type>` emits the selected generator's authoring context into the agent's context as part of the method scaffold, present after setup and before any `clew spec` run.
- The emitted authoring context is tool-owned and reconciled on a re-run like the rest of the method scaffold (CON-033): an unedited copy is updated to the tool's version, a project-edited one is preserved.
- No skill names a concrete, generator-specific anchor form or generate command; each refers to the emitted generator context (and to `clew --help`) instead.
- Each in-tree generator (TypeScript, Java) provides an authoring context whose stated marker form matches the anchors that generator actually discovers.

**Out of scope**
- The post-generation traceables README (SW-018, SW-037) — it keeps documenting the concrete symbols; this story adds the pre-generation conventions, it does not fold the two together.
- Authoring contexts for generators beyond the two in-tree ones — each new generator provides its own when it is added.
- Harness-specific rendering of the context — it rides the existing harness-adapter emission (ARCH-008); this story adds no new harness axis.

## Relations

**Realizes**

- [ARCH-TMP-001 — The generator interface provides the generator's authoring context](../specs/ARCH-TMP-001-generator-provides-authoring-context.md)
- [SW-TMP-001 — Setup emits the selected generator's authoring context into the method](../specs/SW-TMP-001-setup-emits-generator-authoring-context.md)

**Related**

- Extends [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](../specs/ARCH-003-generator-interface.md).
- Rides the method emission of [SW-043 — Setup emits the method scaffold through the configured harness adapter](../specs/SW-043-setup-emits-method-scaffold.md) and [ARCH-008 — The agent-facing method is emitted through a harness-adapter interface](../specs/ARCH-008-method-behind-harness-adapter.md).
- Inherits the tool-owned/reconcile model of [CON-033 — The method scaffold is tool-owned but project-editable](../specs/CON-033-method-scaffold-tool-owned.md).
- Distinct from the post-generation README of [SW-018 — The TypeScript generator emits per-set string enums and an anchoring helper module](../specs/SW-018-typescript-output.md) and [SW-037 — The Java generator emits per-set enums and anchors code with generated annotations](../specs/SW-037-java-annotation-anchored-output.md).
