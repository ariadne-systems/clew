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

---

## 2. Error Handling

- Exceptions must never be swallowed silently.
- Fail fast on invalid input unless the architecture explicitly requires defensive tolerance.
- Do not convert checked exceptions into unchecked ones without justification.
- Error handling logic must remain explicit and traceable.

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

---

## 4. Dependencies

- Do not introduce new dependencies without explicit justification.
- Prefer standard library solutions when equivalent.
- Avoid adding dependencies for minor convenience.
- Do not increase framework coupling unnecessarily.
- Dependency upgrades require justification if they change behavior or compatibility.

---

## 5. Change Discipline

- Keep changes minimal and scoped to the task.
- Do not refactor unrelated code opportunistically.
- Avoid mixing structural refactoring with behavioral changes in a single change set.
- Maintain backward compatibility unless the task explicitly requires breaking changes.

---

## 6. Commits

- Each change shall be atomic and self-contained.
- Do not bundle unrelated concerns in a single change.
- Commit messages must describe:
    - What changed.
    - Why it changed.
- Avoid vague commit messages.

---

## 7. Deviation Protocol

If compliance with any guideline is technically impossible:

1. Explicitly identify the rule being deviated from.
2. Provide technical justification.
3. Minimize the deviation scope.
4. Ensure the deviation does not violate higher architectural constraints.

Silent deviation is prohibited.
