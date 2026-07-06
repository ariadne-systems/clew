import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { SpecSetMatcher } from "../config/config.js";
import {
  readGenerators,
  readIgnore,
  readLenses,
  readSpecSets,
} from "../config/config.js";
import type { GeneratedFile, Generator } from "./generator.js";
import { GENERATED_SUBDIR, resolveGeneratorOrThrow } from "./generator.js";
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
  /** How many traceables were generated — the `active` and `deprecated` specs. */
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
 * yields byte-identical output, and clew's reserved output directory is wiped and
 * regenerated on each run.
 */
export const spec: (options: SpecOptions) => Promise<SpecResult> = realizes(
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
    // Only `active` and `deprecated` specs become traceables; a `planned` spec is
    // filtered out here.
    const generated = traceables.filter(
      (traceable) =>
        traceable.status === "active" || traceable.status === "deprecated",
    );
    const specSets = groupIntoSpecSets(generated, matchers, ignorePatterns);

    // Generate and validate every generator's output before replacing any
    // directory, so a bad path fails before the previous output is touched.
    const produced: {
      name: string;
      outputDir: string;
      writeRoot: string;
      files: readonly GeneratedFile[];
    }[] = [];
    for (const config of generatorConfigs) {
      const generator = resolveGeneratorOrThrow(
        config.type,
        options.resolveGenerator,
      );
      const outputDir = join(
        config.outputDir ?? generator.defaultOutputDir,
        GENERATED_SUBDIR,
      );
      const files = await generator.generate(specSets, { outputDir });
      for (const file of files) {
        assertSafeGeneratedPath(file.path);
      }
      produced.push({
        name: config.type,
        outputDir,
        writeRoot: join(projectRoot, outputDir),
        files,
      });
    }

    // Group files by reserved directory (two generators may share one); the
    // directories are independent, so replace them concurrently.
    const filesByRoot = new Map<string, GeneratedFile[]>();
    for (const { writeRoot, files } of produced) {
      const bucket = filesByRoot.get(writeRoot) ?? [];
      bucket.push(...files);
      filesByRoot.set(writeRoot, bucket);
    }
    await Promise.all(
      [...filesByRoot].map(([writeRoot, files]) =>
        replaceDirectory(writeRoot, files),
      ),
    );

    const reports: GeneratorReport[] = produced.map(
      ({ name, outputDir, files }) => ({
        name,
        outputDir,
        files: files.map((file) => file.path),
      }),
    );

    return {
      traceableCount: generated.length,
      specSetCount: specSets.length,
      generators: reports,
    };
  },
);

/**
 * Replaces the reserved output directory atomically: writes the output into a
 * temporary sibling, removes the target, then renames the sibling into place.
 */
const replaceDirectory: (
  writeRoot: string,
  files: readonly GeneratedFile[],
) => Promise<void> = realizes(
  ConTraceables.CON_012_GENERATED_FILES_TOOL_OWNED,
  async (writeRoot: string, files: readonly GeneratedFile[]): Promise<void> => {
    const stagingRoot = `${writeRoot}.staging`;
    await rm(stagingRoot, { recursive: true, force: true });
    await Promise.all(
      files.map((file) => writeGeneratedFile(stagingRoot, file)),
    );
    await rm(writeRoot, { recursive: true, force: true });
    await rename(stagingRoot, writeRoot);
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

/** Writes a generated file under the output root; its path is validated up front, before any wipe. */
async function writeGeneratedFile(
  outputDir: string,
  file: GeneratedFile,
): Promise<void> {
  const target = join(outputDir, file.path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, file.contents, "utf8");
}

/**
 * Rejects a generated path that escapes its output directory — an absolute path, or
 * one that climbs out with `..`. A nested path is allowed, so a generator may emit a
 * subpackage (for example `annotation/Foo.java`); the wipe clears subdirectories too.
 * A bad path is a generator bug, not user input, so it throws plainly.
 */
function assertSafeGeneratedPath(name: string): void {
  const normalized = name.replaceAll("\\", "/");
  const segments = normalized.split("/");
  if (
    name.length === 0 ||
    normalized.startsWith("/") ||
    /^[A-Za-z]:/.test(normalized) ||
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error(
      `Generator returned "${name}", which escapes its output directory; a generated path must stay within it.`,
    );
  }
}
