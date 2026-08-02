import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { ClewError, ErrorCode } from "../errors.js";
import { readFileOrEmpty, writeIfAbsent } from "../fs/files.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
import { emitMaterials } from "../harness/emit.js";
import type { EmitOptions, EmittedMethod } from "../harness/harness.js";
import { loadAdrTemplate, loadMethodMaterials } from "../harness/materials.js";
import { DEFAULT_PLACEMENT, type Placement } from "../harness/placement.js";
import { AGENT_PRESETS } from "../harness/presets.js";
import { reconcileMethodFile } from "../harness/reconcile.js";
import type { Generator } from "../spec/generator.js";
import {
  configExists,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_MODE,
  DEFAULT_PADDING,
  type GeneratorConfig,
  readGenerators,
  readPlacement,
  type SchemaConfig,
} from "./config.js";
import {
  ARCHITECTURE_DOC_FILE,
  DEFAULT_ARCHITECTURE_DOC,
  DEFAULT_SCHEMA_DIR,
  DEFAULT_SPEC_EXAMPLE,
  DEFAULT_SPEC_SCHEMA,
  DEFAULT_STORY_EXAMPLE,
  DEFAULT_STORY_SCHEMA,
  DEFAULT_WAIVERS,
  GITIGNORE_ENTRIES,
  GITIGNORE_HEADER,
  SPEC_EXAMPLE_FILE,
  SPEC_SCHEMA_FILE,
  STORY_EXAMPLE_FILE,
  STORY_SCHEMA_FILE,
} from "./scaffold-templates.js";

export type SetupOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** The target generator to configure. Validated before anything is written; omitted → none. */
  generator?: string;
  /** Resolves a generator name to its implementation, for validation. Defaults to the in-tree registry. */
  resolveGenerator?: (name: string) => Generator | undefined;
  /** A label identifying the target agent (for example `claude`, `cursor`); recorded as the placement's `type`, never used by the engine. */
  type?: string;
  /** The skills directory to emit into. Defaults to the shipped default; a re-run re-emits to the recorded placement. */
  skillsDir?: string;
  /** The governance directory to emit the layered contract into. Defaults to the shipped default. */
  governanceDir?: string;
  /** The entry file that loads the governance (for example `CLAUDE.md`, `AGENTS.md`). Defaults to the shipped default. */
  entryFile?: string;
};

export type SetupResult = {
  /** Whether a configuration was written; false when one already existed. */
  created: boolean;
  /** The configuration file path. */
  configFile: string;
  /** The layout directories ensured (relative to the project root); empty when nothing was created. */
  directories: string[];
  /** The lens ids written; empty when nothing was created. */
  lenses: string[];
  /** The generator this call configured — the fresh selection, or the one filled into an existing empty `generators` on a re-run; null when none was configured. */
  generator: string | null;
  /** The schema files written (relative to the project root); empty when they already existed. */
  schemas: string[];
  /** Whether the project's `.gitignore` was created or appended to. */
  gitignoreUpdated: boolean;
  /** The agent's locations for clew's method: the skills dir, governance dir, and entry file. */
  agent: Placement;
  /** The method files written to the tool's current version, relative to the project root. */
  methodWritten: string[];
  /** The project stubs and index seeded (only those that were absent). */
  methodSeeded: string[];
  /** The method files left as they are because the project has edited them. */
  methodPreserved: string[];
};

const ADR_DIR = "docs/adr";
const ADR_TEMPLATE_FILE = "ADR-template.md";

export const setup: (options?: SetupOptions) => Promise<SetupResult> = realizes(
  [
    SwTraceables.SW_011_SCAFFOLD_DEFAULT_CONFIG,
    ConTraceables.CON_010_SETUP_NEVER_OVERWRITES,
  ],
  async (options: SetupOptions = {}): Promise<SetupResult> => {
    const configFile = options.configFile ?? DEFAULT_CONFIG_FILE;
    const root = dirname(configFile);
    const resolveGenerator =
      options.resolveGenerator ?? resolveBuiltinGenerator;
    // Validate the generator first, before touching disk.
    const generators = generatorsSection(options.generator, resolveGenerator);
    const exists = await configExists(configFile);
    // The placement is chosen at scaffold time and recorded; a re-run re-emits to
    // the recorded placement, not an override.
    const placement = exists
      ? await readPlacement(configFile)
      : resolvePlacement(options);
    if (exists) {
      // Re-emit the tool-owned method for the recorded harness; the configuration
      // and every project-owned file (stubs, index) are left as they are, save the
      // one additive exception below.
      const generatorAdded = await fillGeneratorIfEmpty(configFile, generators);
      const method = await emitMethod(placement, root, {
        seedProjectFiles: false,
      });
      const adr = await emitAdrTemplate(root);
      return {
        created: false,
        configFile,
        directories: [],
        lenses: [],
        generator: generatorAdded,
        schemas: [],
        gitignoreUpdated: false,
        agent: placement,
        methodWritten: [...method.written, ...adr.written],
        methodSeeded: [...method.seeded],
        methodPreserved: [...method.preserved, ...adr.preserved],
      };
    }
    const directories = [
      DEFAULT_LAYOUT.stories.dir,
      DEFAULT_LAYOUT.specs.dir,
      DEFAULT_LAYOUT.drafts.dir,
    ];
    for (const dir of directories) {
      await mkdir(join(root, dir), { recursive: true });
    }
    const { schemas, written } = await scaffoldSchemas(root);
    const gitignoreUpdated = await scaffoldGitignore(root);
    await seedArchitectureDoc(root);
    const method = await emitMethod(placement, root);
    const adr = await emitAdrTemplate(root);
    // Write the config last, so a config on disk always implies a complete scaffold.
    const config = {
      idGeneration: { mode: DEFAULT_MODE, padding: DEFAULT_PADDING },
      lenses: DEFAULT_LENSES,
      layout: DEFAULT_LAYOUT,
      generators,
      schemas,
      waivers: DEFAULT_WAIVERS,
      agent: placement,
    };
    await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return {
      created: true,
      configFile,
      directories,
      lenses: DEFAULT_LENSES.map((lens) => lens.id),
      generator: options.generator ?? null,
      schemas: written,
      gitignoreUpdated,
      agent: placement,
      methodWritten: [...method.written, ...adr.written],
      methodSeeded: [...method.seeded],
      methodPreserved: [...method.preserved, ...adr.preserved],
    };
  },
);

/** Loads the neutral method materials and emits them into the placement. */
const emitMethod: (
  placement: Placement,
  root: string,
  options?: EmitOptions,
) => Promise<EmittedMethod> = realizes(
  [
    SwTraceables.SW_043_SETUP_EMITS_METHOD_SCAFFOLD,
    SwTraceables.SW_044_SETUP_SEEDS_PROJECT_STUBS,
  ],
  async (
    placement: Placement,
    root: string,
    options?: EmitOptions,
  ): Promise<EmittedMethod> => {
    const materials = await loadMethodMaterials();
    return emitMaterials(placement, materials, root, options);
  },
);

/** Reconciles the tool's ADR template into `docs/adr`: updated while unedited, preserved once the project edits it (project ADRs untouched). */
const emitAdrTemplate: (
  root: string,
) => Promise<{ written: string[]; preserved: string[] }> = realizes(
  SwTraceables.SW_045_SETUP_SEEDS_ADR_PRACTICE,
  async (root: string): Promise<{ written: string[]; preserved: string[] }> => {
    const path = `${ADR_DIR}/${ADR_TEMPLATE_FILE}`;
    const outcome = await reconcileMethodFile(
      join(root, path),
      await loadAdrTemplate(),
    );
    return outcome === "written"
      ? { written: [path], preserved: [] }
      : { written: [], preserved: [path] };
  },
);

/** Validates the requested generator and returns the `generators` config — a singleton, or empty when none was requested. */
const generatorsSection: (
  generator: string | undefined,
  resolveGenerator: (name: string) => Generator | undefined,
) => GeneratorConfig[] = realizes(
  SwTraceables.SW_039_SETUP_SELECTS_GENERATOR,
  (
    generator: string | undefined,
    resolveGenerator: (name: string) => Generator | undefined,
  ): GeneratorConfig[] => {
    if (generator === undefined) {
      return [];
    }
    if (resolveGenerator(generator) === undefined) {
      throw new ClewError(
        ErrorCode.UNKNOWN_GENERATOR,
        `Unknown generator "${generator}". Run setup without \`--generator\`, or pass one the tool provides.`,
      );
    }
    return [{ type: generator }];
  },
);

/**
 * On a re-run, fills an absent or empty `generators` with the already-validated
 * requested generator, leaving every other section as it is; a `generators` that
 * already names one is never replaced. Returns the generator written, or null when
 * none was requested or one was already configured. A plain re-run touches no file.
 */
const fillGeneratorIfEmpty: (
  configFile: string,
  generators: GeneratorConfig[],
) => Promise<string | null> = realizes(
  SwTraceables.SW_039_SETUP_SELECTS_GENERATOR,
  async (
    configFile: string,
    generators: GeneratorConfig[],
  ): Promise<string | null> => {
    const [requested] = generators;
    if (requested === undefined) {
      return null;
    }
    if ((await readGenerators(configFile)).length > 0) {
      return null;
    }
    const configText = await readFile(configFile, "utf8");
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(configText) as Record<string, unknown>;
    } catch (error) {
      throw new ClewError(
        ErrorCode.INVALID_JSON,
        `${configFile} is not valid JSON.`,
        { location: configFile, note: (error as Error).message, cause: error },
      );
    }
    raw.generators = generators;
    await writeFile(configFile, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    return requested.type;
  },
);

/** Builds the placement from the setup options, defaulting each field to the shipped default. */
function resolvePlacement(options: SetupOptions): Placement {
  const overriddenDirs =
    options.skillsDir !== undefined ||
    options.governanceDir !== undefined ||
    options.entryFile !== undefined;
  const preset =
    options.type !== undefined ? AGENT_PRESETS[options.type] : undefined;
  if (options.type !== undefined && preset === undefined && !overriddenDirs) {
    throw new ClewError(
      ErrorCode.INVALID_OPTIONS,
      `Unknown agent type "${options.type}". Use a known type (${Object.keys(AGENT_PRESETS).join(", ")}), or supply --skills-dir / --governance-dir / --entry-file for a custom agent.`,
    );
  }
  const base = preset ?? DEFAULT_PLACEMENT;
  return {
    type: options.type ?? (overriddenDirs ? "custom" : base.type),
    skillsDir: options.skillsDir ?? base.skillsDir,
    governanceDir: options.governanceDir ?? base.governanceDir,
    entryFile: options.entryFile ?? base.entryFile,
  };
}

/**
 * Writes the default document-schema templates and a copyable valid example
 * beside each (only when absent), and returns the `schemas` config plus the files
 * written. The example demonstrates the field format clew reads, so a fresh
 * project — which has no existing story or spec to copy — follows the form rather
 * than guessing it.
 */
const scaffoldSchemas: (
  root: string,
) => Promise<{ schemas: SchemaConfig; written: string[] }> = realizes(
  SwTraceables.SW_040_SETUP_SCAFFOLDS_SCHEMAS,
  async (
    root: string,
  ): Promise<{ schemas: SchemaConfig; written: string[] }> => {
    await mkdir(join(root, DEFAULT_SCHEMA_DIR), { recursive: true });
    const storyPath = `${DEFAULT_SCHEMA_DIR}/${STORY_SCHEMA_FILE}`;
    const specPath = `${DEFAULT_SCHEMA_DIR}/${SPEC_SCHEMA_FILE}`;
    const scaffolds: [string, string][] = [
      [storyPath, DEFAULT_STORY_SCHEMA],
      [specPath, DEFAULT_SPEC_SCHEMA],
      [`${DEFAULT_SCHEMA_DIR}/${STORY_EXAMPLE_FILE}`, DEFAULT_STORY_EXAMPLE],
      [`${DEFAULT_SCHEMA_DIR}/${SPEC_EXAMPLE_FILE}`, DEFAULT_SPEC_EXAMPLE],
    ];
    const written: string[] = [];
    for (const [path, contents] of scaffolds) {
      if (await writeIfAbsent(join(root, path), contents)) {
        written.push(path);
      }
    }
    return { schemas: { story: storyPath, spec: specPath }, written };
  },
);

/** Appends the missing tool-output entries to the project's `.gitignore`, never rewriting existing content. */
const scaffoldGitignore: (root: string) => Promise<boolean> = realizes(
  SwTraceables.SW_041_SETUP_IGNORES_TOOL_OUTPUT,
  async (root: string): Promise<boolean> => {
    const path = join(root, ".gitignore");
    const existing = await readFileOrEmpty(path);
    const present = new Set(existing.split(/\r?\n/).map((line) => line.trim()));
    const missing = GITIGNORE_ENTRIES.filter((entry) => !present.has(entry));
    if (missing.length === 0) {
      return false;
    }
    const separator =
      existing.length === 0 ? "" : existing.endsWith("\n") ? "\n" : "\n\n";
    const block = `${GITIGNORE_HEADER}\n${missing.join("\n")}\n`;
    await writeFile(path, existing + separator + block, "utf8");
    return true;
  },
);

/** Seeds the narrative architecture overview once (`docs/spec/architecture.md`); the project fills it and setup never overwrites it. */
const seedArchitectureDoc: (root: string) => Promise<boolean> = realizes(
  SwTraceables.SW_046_SETUP_SEEDS_ARCHITECTURE_OVERVIEW,
  async (root: string): Promise<boolean> => {
    const absolute = join(root, ARCHITECTURE_DOC_FILE);
    await mkdir(dirname(absolute), { recursive: true });
    return writeIfAbsent(absolute, DEFAULT_ARCHITECTURE_DOC);
  },
);
