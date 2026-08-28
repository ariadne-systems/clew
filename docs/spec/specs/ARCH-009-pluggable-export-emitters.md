**Title**
Export is delegated to format-specific emitters behind a narrow interface

**Lens**: ARCH

**Status**: planned

**Description**
Writing clew's trace state in a given interchange format is the job of a format-specific emitter, chosen by configuration and implemented behind a narrow interface.
The engine assembles one tool-neutral trace model from its data and hands that same model to each configured emitter; an emitter maps the model to the bytes of its format and nothing more — it does not re-read the corpus, recompute coverage, or reach into engine internals.
The concrete emitters live in-tree, bound at a single registry point and resolved by the name a project lists under `emitters`, exactly as generators are (ADR-0007).

**Rationale**
Keeping each output format behind a narrow contract keeps the export decoupled from the engine and keeps the cost of a new format down to one implementation plus its registration.
Building the model once and letting each emitter purely serialize it means every format sees the same trace state and no emitter can diverge on what that state is — the model is the single source, the emitter only its rendering.
This is the same shape as the generator interface (ARCH-003) and the id-strategy seam (ARCH-001) — a sibling boundary for output emission, not a replacement.

**Verification Description**
With an emitter configured, export runs through the interface; the engine builds the model once and uses emitters only through the interface, binding the concrete ones at a single registry point.
Adding a format is a new emitter implementing the contract plus its registration, with no change to the model or the engine.

## Relations

**Realizes**

- [SYS-016](SYS-016-cross-tool-trace-export.md)

**Related**

- The output-emission sibling of the generator interface [ARCH-003](ARCH-003-generator-interface.md) and the id-strategy seam [ARCH-001](ARCH-001-pluggable-id-strategy.md).
