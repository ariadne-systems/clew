import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { ClewError, ErrorCode } from "../errors.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
import type { Generator } from "../spec/generator.js";
import {
  configExists,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_MODE,
  DEFAULT_PADDING,
  type GeneratorConfig,
  type SchemaConfig,
} from "./config.js";
import {
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
  /** The generator configured, or null when none was selected. */
  generator: string | null;
  /** The schema files written (relative to the project root); empty when they already existed. */
  schemas: string[];
  /** Whether the project's `.gitignore` was created or appended to. */
  gitignoreUpdated: boolean;
};

export const setup: (options?: SetupOptions) => Promise<SetupResult> = realizes(
  [
    SwTraceables.SW_011_SCAFFOLD_DEFAULT_CONFIG,
    ConTraceables.CON_010_SETUP_NEVER_OVERWRITES,
    SwTraceables.SW_042_SETUP_WAIVES_STAKEHOLDER_LENS,
  ],
  async (options: SetupOptions = {}): Promise<SetupResult> => {
    const configFile = options.configFile ?? DEFAULT_CONFIG_FILE;
    const resolveGenerator =
      options.resolveGenerator ?? resolveBuiltinGenerator;
    // Validate the generator first, so an unknown one is rejected even when a
    // configuration already exists — before touching disk either way.
    const generators = generatorsSection(options.generator, resolveGenerator);
    if (await configExists(configFile)) {
      return {
        created: false,
        configFile,
        directories: [],
        lenses: [],
        generator: null,
        schemas: [],
        gitignoreUpdated: false,
      };
    }
    const root = dirname(configFile);
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
    // Write the config last, so a config on disk always implies a complete scaffold.
    const config = {
      idGeneration: { mode: DEFAULT_MODE, padding: DEFAULT_PADDING },
      lenses: DEFAULT_LENSES,
      layout: DEFAULT_LAYOUT,
      generators,
      schemas,
      waivers: DEFAULT_WAIVERS,
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
    };
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
