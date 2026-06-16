<!-- Copyright © 2026 Ariadne Systems GmbH. All rights reserved. -->

# AI Testing Contract

This document defines mandatory testing rules.

---

## 1. Test Files & Naming

| Scope | Naming | Runs by default |
| --- | --- | --- |
| Unit / component | `*.test.ts` | yes |

Tests are colocated with the code under test in `src/`, run by Vitest.
Each package has a `vitest.config.ts` that merges the shared root config (`vitest.shared.ts`); the root `vitest.config.ts` lists the `projects`.

---

## 2. Parallel Execution

Vitest runs test files in parallel (separate workers); tests within a file run sequentially.
Filesystem or other shared-state tests must isolate themselves — for example a unique temp directory per test — rather than rely on a shared fixed path.

---

## 3. Coverage

Coverage is not yet enforced.
When it is, use Vitest's coverage with explicit thresholds; do not claim a gate that is not wired.

---

## 4. Test Design

- Arrange–Act–Assert structure.
- Deterministic tests only; never rely on execution order.
- No wall-clock time or randomness in assertions; control or inject them.
- No uncontrolled network or environment access.
- Test names describe expected behaviour, not internal calls.
- Group related tests into `describe` suites by concern when feasible; name suites by behaviour, not by spec id (test-to-spec traceability is the annotation system's job).
- Prefer observable behaviour over implementation details; avoid unnecessary mocking.
- Relative imports in tests use the `.js` extension (NodeNext): `import { x } from "./x.js"`.
