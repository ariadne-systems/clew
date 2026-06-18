import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { readGenerators, readLenses } from "./config.js";
import { AriadneError, ErrorCode } from "./errors.js";
import type { GeneratedFile, Generator } from "./generator.js";
import { scan } from "./scan.js";
import { groupIntoSpecSets, lensMatchers } from "./spec-set.js";

export type SpecOptions = {
  /**
   * Resolves a configured generator name to its implementation. The concrete
   * generators live in their own packages; injecting their resolution keeps the
   * core free of any dependency on a concrete generator (ARCH-003, ADR-0001 D9).
   */
  resolveGenerator: (name: string) => Generator | undefined;
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Root the generated files are written under. Defaults to the process cwd. */
  outputDir?: string;
};

/** What a single generator produced this run. */
export type GeneratorReport = {
  name: string;
  /** The generated files, by their path relative to the output root. */
  files: string[];
};

export type SpecResult = {
  /** How many traceables the scan found. */
  traceableCount: number;
  /** The spec sets the traceables were grouped into. */
  specSetCount: number;
  /** What each configured generator produced, in configured order. */
  generators: GeneratorReport[];
};

/**
 * Generates the traceables and anchoring utilities from the specs (SW-014; STR-011).
 * It scans the configured artifacts into the traceable set (SW-013), groups them
 * into spec sets (by lens, the default), and drives each configured generator
 * through the generator interface only — the core performs no language-specific
 * emission and references no concrete generator (ARCH-003). Generation is
 * deterministic: the scan and grouping are sorted, so an unchanged spec set
 * yields byte-identical output, and a generated file is overwritten on each run
 * (CON-012).
 */
export async function spec(options: SpecOptions): Promise<SpecResult> {
  const outputDir = options.outputDir ?? ".";
  const traceables = await scan({ configFile: options.configFile });
  const lenses = await readLenses(options.configFile);
  const specSets = groupIntoSpecSets(traceables, lensMatchers(lenses));
  const generatorNames = await readGenerators(options.configFile);

  const reports: GeneratorReport[] = [];
  for (const name of generatorNames) {
    const generator = resolveOrThrow(name, options.resolveGenerator);
    const files = await generator.generate(specSets);
    for (const file of files) {
      await writeGeneratedFile(outputDir, file);
    }
    reports.push({ name, files: files.map((file) => file.path) });
  }

  return {
    traceableCount: traceables.length,
    specSetCount: specSets.length,
    generators: reports,
  };
}

/**
 * Resolves a configured generator name to its implementation, failing fast with
 * a stable code when the configuration names a generator that is not registered
 * (ARCH-002). Nothing is generated until every configured generator resolves.
 */
function resolveOrThrow(
  name: string,
  resolveGenerator: (name: string) => Generator | undefined,
): Generator {
  const generator = resolveGenerator(name);
  if (generator === undefined) {
    throw new AriadneError(
      ErrorCode.UNKNOWN_GENERATOR,
      `Configured generator "${name}" is not registered; remove it from \`generators\` or install a generator that provides it.`,
    );
  }
  return generator;
}

/** Writes a generated file under the output root, overwriting any prior content (CON-012). */
async function writeGeneratedFile(
  outputDir: string,
  file: GeneratedFile,
): Promise<void> {
  const target = join(outputDir, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.contents, "utf8");
}
