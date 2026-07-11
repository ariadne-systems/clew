**Title**
The agent-facing method is emitted through a harness-adapter interface

**Lens**: ARCH

**Status**: planned

**Description**
Emitting the agent-facing method — the generic governance baselines and the clew skills — for a target harness is the job of a harness-specific adapter, chosen by configuration and implemented behind a narrow interface.
The engine holds the method as harness-neutral materials, with no harness path or format baked in; given those materials, an adapter writes them into its harness's locations and conventions.
The engine uses adapters only through this interface, never reaching into a concrete adapter's internals; the concrete adapters live in-tree, bound at the single registry point that already binds the generators (ADR-0007), and the architecture test that forbids naming a concrete generator outside the registry forbids naming a concrete adapter too.
The interface ships with one implementation, Claude; a further harness is a new adapter implementing the contract plus its registration, and the neutral materials do not move.

**Rationale**
The method's content is the same across harnesses; only where it lands and in what form differs (ADR-0008).
Keeping that behind a per-harness writer keeps the method authored once and keeps the cost of a new harness down to one implementation behind the interface.
Reusing the generator seam's resolution — in-tree, registry-bound, enforced by one architecture test — keeps the codebase to a single "neutral core, pluggable emission" pattern rather than two.
This is the same shape as the generator boundary (ARCH-003), on the harness axis rather than the target-language axis — a sibling boundary, not a replacement.

**Verification Description**
The method emission resolves its adapter through the interface, and the engine names a concrete adapter only at the registry — enforced by the architecture test that already guards the generators.
A fake adapter registered for a test harness receives the neutral materials and is the only thing that writes harness-specific output; the engine writes none directly.
Adding a harness is a new adapter implementing the contract plus its registration.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-004 — Configuration and state](SYS-004-configuration-and-state.md)

**Related**

- Sibling of [ARCH-003 — Generation is delegated to language-specific generators behind a narrow interface](ARCH-003-generator-interface.md): the same in-tree-implementation-behind-an-interface pattern, on the harness axis.
- Realizes [ADR-0008 — The agent-facing method is emitted through per-harness adapters](../../adr/ADR-0008-harness-adapter-for-agent-facing-method.md).
