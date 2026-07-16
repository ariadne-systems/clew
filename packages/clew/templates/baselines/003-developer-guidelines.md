<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# Development Guidelines (Default Baseline)

These guidelines define the default development standards.
Project-specific guidelines may extend these rules but must not weaken them without explicit justification.

---

## 1. Code Style

- Names shall be descriptive and reflect domain meaning.
- Avoid abbreviations unless they are domain-standard and unambiguous.
- Methods shall have a single, well-defined responsibility.
- Avoid excessive method length or deeply nested logic.
- Prefer immutability where practical.
- Avoid hidden side effects.
- Do not introduce speculative abstractions or generalizations.

Deviation from style rules must be explicitly justified in the solution plan.

**Rationale.** Code is read far more than written; names and shapes that carry intent are what let the next reader change it safely.

---

## 2. Error Handling

- Exceptions must never be swallowed silently.
- Fail fast on invalid input unless the architecture explicitly requires defensive tolerance.
- Do not erase a structured or expected error by collapsing it into an undifferentiated generic error without justification; preserve the original cause and its classification.
- Error handling logic must remain explicit and traceable.

**Rationale.** A swallowed or silently converted error hides the one signal that something is wrong, moving the failure to a later, harder-to-trace point.

---

## 3. Testing

- Every behavioral change requires a corresponding test.
- Refactorings that do not change behavior must not alter test semantics.
- Tests shall be independent, deterministic, and repeatable.
- Tests must not rely on execution order.
- Test names shall describe expected behavior, not internal method calls.
- Avoid unnecessary mocking.
- Prefer testing observable behavior over implementation details.

If a change cannot be reasonably tested, explicitly justify why.

**Rationale.** A behavioral change without a test has no reproducible evidence it works or keeps working; an order-dependent or flaky test gives that evidence falsely.

---

## 4. Dependencies

- Do not introduce new dependencies without explicit justification.
- Prefer standard library solutions when equivalent.
- Avoid adding dependencies for minor convenience.
- Do not increase framework coupling unnecessarily.
- Dependency upgrades require justification if they change behavior or compatibility.

**Rationale.** Every dependency is a permanent surface of risk, upgrade cost, and coupling; the bar is whether it earns that, not whether it is convenient today.

---

## 5. Change Discipline

- Keep changes minimal and scoped to the task.
- Do not refactor unrelated code opportunistically.
- Avoid mixing structural refactoring with behavioral changes in a single change set.
- Maintain backward compatibility unless the task explicitly requires breaking changes.

**Rationale.** Mixing structural and behavioral change in one set makes the diff impossible to review for either; small, single-purpose changes keep intent legible.

---

## 6. Commits

- Each change shall be atomic and self-contained.
- Do not bundle unrelated concerns in a single change.
- Commit messages must describe:
    - What changed.
    - Why it changed.
- Avoid vague commit messages.

**Rationale.** The log is the durable record of why the code is as it is; a vague or bundled commit destroys that history for everyone after.

---

## 7. Deviation Protocol

If compliance with any guideline is technically impossible:

1. Explicitly identify the rule being deviated from.
2. Provide technical justification.
3. Minimize the deviation scope.
4. Ensure the deviation does not violate higher architectural constraints.

Silent deviation is prohibited.

**Rationale.** A rule will sometimes be genuinely impossible to meet; a stated, scoped, justified deviation keeps that an auditable exception rather than a silent erosion of the standard.

---

## 8. Comments

- The spec a symbol anchors to (`realizes` / `verifies` / `concerns`) is the single source of its intent.
Do not restate the spec's description or rationale in a comment: that duplicates the spec and rots when the spec changes, and the anchor already points a reader to the intent.
- A comment earns its place only by carrying what the spec and the code's own names do not — a non-obvious implementation mechanic, a local invariant the code relies on, or a subtlety a reader would otherwise miss.
A comment that only paraphrases the spec, or restates what the code plainly does, is deleted.
- Never write a spec id in a comment; the anchor is the sole reference (enforced by `clew check`'s spec-id-in-comment member).
This section extends that rule from ids to spec content.
- Prefer few load-bearing comments over matching a high surrounding comment density; where existing code over-comments, do not propagate it.

**Rationale.** A comment that restates the spec or the code rots on its own schedule and drifts from what it describes; the ones worth keeping carry what neither the anchor nor the names already say.
