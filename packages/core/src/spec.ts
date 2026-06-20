import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, SwTraceables, traces } from "@ariadne-thread/trace";
import type { SpecSetMatcher } from "./config.js";
import {
  readGenerators,
  readIgnore,
  readLenses,
  readSpecSets,
} from "./config.js";
import { AriadneError, ErrorCode } from "./errors.js";
import type { GeneratedFile, Generator } from "./generator.js";
import { GENERATED_MARKER } from "./generator.js";
import { scan } from "./scan.js";
import { groupIntoSpecSets, lensMatchers } from "./spec-set.js";

export type SpecOptions = {
  /**
   * Resolves a configured generator name to its implementation. The concrete
   * generators live in their own packages; injecting their resolution keeps the
   * core free of any dependency on a concrete generator (ADR-0001 D9).
   */
  resolveGenerator: (name: string) => Generator | undefined;
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the output directory is resolved against. Defaults to the process cwd. */
  outputDir?: string;
};

/** What a single generator produced this run. */
export type GeneratorReport = {
  name: string;
  /** The directory this generator wrote into, relative to the project root. */
  outputDir: string;
  /** The generated files, by their name within the output directory. */
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
 * Generates the traceables and anchoring utilities from the specs (STR-011).
 * It scans the configured artifacts into the traceable set, groups them
 * into spec sets (by lens, the default), and drives each configured generator
 * through the generator interface only — the core performs no language-specific
 * emission and references no concrete generator. Generation is
 * deterministic: the scan and grouping are sorted, so an unchanged spec set
 * yields byte-identical output, and a generated file is overwritten on each run.
 */
export const spec: (options: SpecOptions) => Promise<SpecResult> = traces(
  SwTraceables.SW_014_GENERATE_TRACEABLES,
  async (options: SpecOptions): Promise<SpecResult> => {
    const { configFile } = options;
    const projectRoot = options.outputDir ?? ".";
    // These reads are independent; run them concurrently rather than serially.
    const [traceables, matchers, ignorePatterns, generatorConfigs] =
      await Promise.all([
        scan({ configFile }),
        resolveMatchers(configFile),
        readIgnore(configFile),
        readGenerators(configFile),
      ]);
    const specSets = groupIntoSpecSets(traceables, matchers, ignorePatterns);

    const reports: GeneratorReport[] = [];
    // The set of files written under each write-root this run, so stale files can be pruned.
    const writtenByRoot = new Map<string, Set<string>>();
    for (const config of generatorConfigs) {
      const generator = resolveOrThrow(config.type, options.resolveGenerator);
      const outputDir = config.outputDir ?? generator.defaultOutputDir;
      const writeRoot = join(projectRoot, outputDir);
      const files = await generator.generate(specSets, { outputDir });
      await Promise.all(
        files.map((file) => writeGeneratedFile(writeRoot, file)),
      );

      const written = writtenByRoot.get(writeRoot) ?? new Set<string>();
      for (const file of files) {
        written.add(file.path);
      }
      writtenByRoot.set(writeRoot, written);
      reports.push({
        name: config.type,
        outputDir,
        files: files.map((file) => file.path),
      });
    }

    // Remove files this tool generated in a previous run that are no longer emitted
    // (e.g. a spec set that disappeared), so a removed id stops compiling.
    await Promise.all(
      [...writtenByRoot].map(([writeRoot, written]) =>
        pruneStaleGenerated(writeRoot, written),
      ),
    );

    return {
      traceableCount: traceables.length,
      specSetCount: specSets.length,
      generators: reports,
    };
  },
);

/**
 * Deletes files in `writeRoot` that carry the generated marker but were not
 * written this run — the tool's own stale output from a prior run. A file the
 * tool did not generate (no marker) is never touched.
 */
const pruneStaleGenerated = traces(
  ConTraceables.CON_012_GENERATED_FILES_TOOL_OWNED,
  async (writeRoot: string, written: ReadonlySet<string>): Promise<void> => {
    let entries: Dirent[];
    try {
      entries = await readdir(writeRoot, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    await Promise.all(
      entries.map(async (entry) => {
        if (entry.isFile() && !written.has(entry.name)) {
          const path = join(writeRoot, entry.name);
          const contents = await readFile(path, "utf8");
          if (contents.includes(GENERATED_MARKER)) {
            await rm(path);
          }
        }
      }),
    );
  },
);

/**
 * Resolves the spec-set matchers: the configured `specSets` when a project
 * declares them, otherwise the default one-set-per-lens matchers.
 */
async function resolveMatchers(
  configFile: string | undefined,
): Promise<SpecSetMatcher[]> {
  const configured = await readSpecSets(configFile);
  if (configured.length > 0) {
    return configured;
  }
  return lensMatchers(await readLenses(configFile));
}

/**
 * Resolves a configured generator name to its implementation, failing fast with
 * a stable code when the configuration names a generator that is not registered
 * Nothing is generated until every configured generator resolves.
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

/** Writes a generated file under the output root, overwriting any prior content. */
async function writeGeneratedFile(
  outputDir: string,
  file: GeneratedFile,
): Promise<void> {
  const target = join(outputDir, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.contents, "utf8");
}
