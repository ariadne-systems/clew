import type { Generator } from "@ariadne-thread/core";
import { createJavaGenerator } from "@ariadne-thread/gen-java";
import { createTypeScriptGenerator } from "@ariadne-thread/gen-typescript";

/**
 * Builds the registry of language generators the CLI knows, keyed by the name a
 * project lists under `generators` (SW-014). The CLI is the composition root:
 * it is the only place that depends on the concrete generator packages, so the
 * core stays free of any concrete generator (ARCH-003, ADR-0001 D9). Adding a
 * target language is a new entry here plus its package — no change to the core.
 */
export function createGeneratorRegistry(): Map<string, Generator> {
  const generators = [createTypeScriptGenerator(), createJavaGenerator()];
  return new Map(generators.map((generator) => [generator.name, generator]));
}
