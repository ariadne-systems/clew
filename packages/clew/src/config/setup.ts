import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { ClewError, ErrorCode } from "../errors.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
import type {
  EmitOptions,
  EmittedMethod,
  HarnessAdapter,
} from "../harness/harness.js";
import { loadAdrTemplate, loadMethodMaterials } from "../harness/materials.js";
import { reconcileMethodFile } from "../harness/reconcile.js";
import { resolveBuiltinHarness } from "../harness/registry.js";
import type { Generator } from "../spec/generator.js";
import {
  configExists,
  DEFAULT_AGENT,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_MODE,
  DEFAULT_PADDING,
  type GeneratorConfig,
  readAgent,
  readGenerators,
  type SchemaConfig,
} from "./config.js";
import {
  ARCHITECTURE_DOC_FILE,
  DEFAULT_ARCHITECTURE_DOC,
  DEFAULT_SCHEMA_DIR,
  DEFAULT_SPEC_SCHEMA,
  DEFAULT_STORY_SCHEMA,
  DEFAULT_WAIVERS,
  GITIGNORE_ENTRIES,
  GITIGNORE_HEADER,
  SPEC_SCHEMA_FILE,
  STORY_SCHEMA_FILE,
} from "./scaffold-templates.js";

export type SetupOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** The target generator to configure. Validated before anything is written; omitted → none. */
  generator?: string;
  /** Resolves a generator name to its implementation, for validation. Defaults to the in-tree registry. */
  resolveGenerator?: (name: string) => Generator | undefined;
  /** The agent harness to emit the method for. Defaults to the recorded one, else claude. */
  agent?: string;
  /** Resolves a harness name to its adapter. Defaults to the in-tree registry. */
  resolveHarness?: (name: string) => HarnessAdapter | undefined;
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
  /** The harness the method was emitted for. */
  agent: string;
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
    SwTraceables.SW_042_SETUP_WAIVES_STAKEHOLDER_LENS,
  ],
  async (options: SetupOptions = {}): Promise<SetupResult> => {
    const configFile = options.configFile ?? DEFAULT_CONFIG_FILE;
    const root = dirname(configFile);
    const resolveGenerator =
      options.resolveGenerator ?? resolveBuiltinGenerator;
    const resolveHarness = options.resolveHarness ?? resolveBuiltinHarness;
    // Validate the generator first, before touching disk.
    const generators = generatorsSection(options.generator, resolveGenerator);
    const exists = await configExists(configFile);
    // The agent is chosen at scaffold time and recorded; a re-run re-emits for the
    // recorded harness, not an override.
    const agent = exists
      ? await readAgent(configFile)
      : (options.agent ?? DEFAULT_AGENT);
    const adapter = resolveHarnessOrThrow(agent, resolveHarness);
    if (exists) {
      // Re-emit the tool-owned method for the recorded harness; the configuration
      // and every project-owned file (stubs, index) are left as they are, save the
      // one additive exception below.
      const generatorAdded = await fillGeneratorIfEmpty(configFile, generators);
      const method = await emitMethod(adapter, root, {
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
        agent,
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
    const method = await emitMethod(adapter, root);
    const adr = await emitAdrTemplate(root);
    // Write the config last, so a config on disk always implies a complete scaffold.
    const config = {
      idGeneration: { mode: DEFAULT_MODE, padding: DEFAULT_PADDING },
      lenses: DEFAULT_LENSES,
      layout: DEFAULT_LAYOUT,
      generators,
      schemas,
      waivers: DEFAULT_WAIVERS,
      agent,
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
      agent,
      methodWritten: [...method.written, ...adr.written],
      methodSeeded: [...method.seeded],
      methodPreserved: [...method.preserved, ...adr.preserved],
    };
  },
);

/** Loads the neutral method materials and emits them through the harness adapter. */
const emitMethod: (
  adapter: HarnessAdapter,
  root: string,
  options?: EmitOptions,
) => Promise<EmittedMethod> = realizes(
  [
    SwTraceables.SW_043_SETUP_EMITS_METHOD_SCAFFOLD,
    SwTraceables.SW_044_SETUP_SEEDS_PROJECT_STUBS,
  ],
  async (
    adapter: HarnessAdapter,
    root: string,
    options?: EmitOptions,
  ): Promise<EmittedMethod> => {
    const materials = await loadMethodMaterials();
    return adapter.emit(materials, root, options);
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
    const raw = JSON.parse(await readFile(configFile, "utf8"));
    raw.generators = generators;
    await writeFile(configFile, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
    return requested.type;
  },
);

/** Resolves the harness adapter, failing fast when the requested harness is unknown. */
function resolveHarnessOrThrow(
  name: string,
  resolveHarness: (name: string) => HarnessAdapter | undefined,
): HarnessAdapter {
  const adapter = resolveHarness(name);
  if (adapter === undefined) {
    throw unknownHarness(name);
  }
  return adapter;
}

function unknownHarness(name: string): ClewError {
  return new ClewError(
    ErrorCode.UNKNOWN_HARNESS,
    `Unknown agent "${name}". Run setup without \`--agent\`, or pass one the tool provides.`,
  );
}

/** Writes the default document-schema templates (only when absent) and returns the `schemas` config plus the files written. */
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
    const written: string[] = [];
    if (await writeIfAbsent(join(root, storyPath), DEFAULT_STORY_SCHEMA)) {
      written.push(storyPath);
    }
    if (await writeIfAbsent(join(root, specPath), DEFAULT_SPEC_SCHEMA)) {
      written.push(specPath);
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

/** Writes `content` to `path` only when it does not exist (`wx`); returns whether it wrote. */
async function writeIfAbsent(path: string, content: string): Promise<boolean> {
  try {
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }
}

/** Reads a file, treating a missing one as empty. */
async function readFileOrEmpty(path: string): Promise<string> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return "";
    }
    throw error;
  }
}
