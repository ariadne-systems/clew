import { createClaudeHarness } from "./claude/index.js";
import type { HarnessAdapter } from "./harness.js";

/**
 * Builds the registry of the in-tree harness adapters, keyed by the name a project
 * records under `agent`. This is the single point where the engine names its
 * concrete adapters; every other module reaches an adapter only through the
 * interface. Adding a harness is a new in-tree adapter plus an entry here (ADR-0008).
 */
export function createHarnessRegistry(): Map<string, HarnessAdapter> {
  const adapters = [createClaudeHarness()];
  return new Map(adapters.map((adapter) => [adapter.name, adapter]));
}

/**
 * Resolves a harness adapter by its configured name from the built-in registry.
 * Returns undefined for an unknown name; the caller turns that into a stable error.
 */
export function resolveBuiltinHarness(
  name: string,
): HarnessAdapter | undefined {
  return createHarnessRegistry().get(name);
}
