<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# Architecture Constraints (Default Baseline)

These constraints define the default architectural governance.
Project-specific architecture files may refine or extend these rules,
but may not weaken them without explicit justification.

---

## 1. Module Boundaries

- Each module shall have a single, well-defined responsibility.
- Modules shall expose behavior only through explicit public interfaces.
- Internal implementation details must not be accessed from outside the module.
- Circular dependencies between modules are strictly prohibited.
- Shared utility modules must not become implicit aggregation points for unrelated responsibilities.

---

## 2. Dependency Direction

- Dependencies point toward the stable, language-neutral core; the core must not depend on volatile or target-specific modules.
- What varies — by target language or external system — is reached through a narrow interface. The core depends on that interface, never on a concrete implementation, and that boundary must not erode.
- Stable platform facilities (the local filesystem, process, standard library) may be used directly. Do not wrap them in ports or adapters unless they genuinely vary; speculative indirection is over-engineering for a local tool.
- No module bypasses a defined interface for convenience.

---

## 3. Structural Integrity

The following actions are considered structural changes:

- Introducing a new module.
- Merging or splitting modules.
- Changing module boundaries.
- Introducing a new external integration.
- Changing dependency direction.
- Introducing a new architectural pattern.

Structural changes require explicit justification in the solution plan.

Do not relocate, merge, or split modules unless the task explicitly requires it
and justification is provided.

---

## 4. Encapsulation and Coupling

- Data structures owned by one module must not be modified by another module.
- Avoid implicit coupling through shared mutable state.
- Avoid cross-module static access patterns.
- Prefer explicit dependencies, passed in, over hidden global or static service access.

---

## 5. Change Scope Discipline

- Limit modifications strictly to the scope required by the task.
- Do not refactor unrelated modules opportunistically.
- Architectural improvements outside task scope require explicit approval.

---

## 6. Default Principle

When in doubt:

- Preserve existing boundaries.
- Prefer extension over restructuring.
- Prefer composition over inheritance across modules.
- Choose the solution that minimizes architectural surface change.
