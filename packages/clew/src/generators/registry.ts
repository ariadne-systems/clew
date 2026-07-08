import { ArchTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Generator } from "../spec/generator.js";
import { createJavaGenerator } from "./java/index.js";
import { createTypeScriptGenerator } from "./typescript/index.js";

/**
 * Builds the registry of the in-tree language generators, keyed by the name a
 * project lists under `generators`. This is the single point where the engine
 * names its concrete generators; every other module reaches a generator only
 * through the generator interface (ARCH-003). Adding a target language is a new
 * in-tree generator plus an entry here — no other change to the engine (ADR-0007).
 */
export const createGeneratorRegistry: () => Map<string, Generator> = realizes(
  [
    SwTraceables.SW_014_GENERATE_TRACEABLES,
    ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
  ],
  (): Map<string, Generator> => {
    const generators = [createTypeScriptGenerator(), createJavaGenerator()];
    return new Map(generators.map((generator) => [generator.name, generator]));
  },
);

/**
 * Resolves a generator by its configured name from the built-in registry — the
 * default the engine's generation, scan, and coverage use when a caller injects no
 * resolver (a test injects a fake). Returns undefined for an unknown name; the
 * caller turns that into a stable error via `resolveGeneratorOrThrow`.
 */
export function resolveBuiltinGenerator(name: string): Generator | undefined {
  return createGeneratorRegistry().get(name);
}
