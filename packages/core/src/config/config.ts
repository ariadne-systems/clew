import { readFile, stat } from "node:fs/promises";
import {
  ArchTraceables,
  ConTraceables,
  concerns,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import { AriadneError, ErrorCode } from "../errors.js";
import type { Generator } from "../spec/generator.js";

/** Default location of the project configuration file. */
export const DEFAULT_CONFIG_FILE = ".ariadnerc.json";

/** Default zero-padding width when the configuration does not state one. */
export const DEFAULT_PADDING: number = concerns(
  ConTraceables.CON_003_PADDING_CONFIGURED,
  3,
);

/** Default id-generation scheme when the configuration does not state one. */
export const DEFAULT_MODE: IdGenerationMode = concerns(
  ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY,
  "sequential",
);

/** A configured generator: its target-language `type` and, optionally, where it writes (ENT-002). */
export type GeneratorConfig = {
  type: string;
  /** Directory it writes into, relative to the project root; defaults to the generator's own. */
  outputDir?: string;
};

/** The id-generation scheme chosen by configuration. */
export type IdGenerationMode = "sequential" | "opaque";

/** The `idGeneration` section of `.ariadnerc.json`. */
export type IdGenerationConfig = {
  mode: IdGenerationMode;
  /** Width to which sequential numbers are zero-padded. */
  padding: number;
};

/** A lens: a derived-spec kind and a valid spec prefix, with a human definition (ADR-0003). */
export type Lens = {
  id: string;
  description: string;
};

/** The default lens set — the opinionated template shipped when none is configured (ADR-0001 D8, ENT-002). */
export const DEFAULT_LENSES: readonly Lens[] = [
  {
    id: "STK",
    description: "Stakeholder spec — what a stakeholder needs from the system.",
  },
  {
    id: "SYS",
    description: "System spec — a capability or behaviour at the system level.",
  },
  {
    id: "SW",
    description:
      "Software spec — observable, verifiable behaviour of a component.",
  },
  {
    id: "ARCH",
    description: "Architecture spec — a structural rule or design decision.",
  },
  {
    id: "NF",
    description:
      "Non-functional spec — a quality attribute such as performance or security.",
  },
  {
    id: "CON",
    description: "Constraint — an invariant that must always hold.",
  },
];

/**
 * A configured spec set: a named grouping selected by a regular expression over
 * a spec's filename (ENT-002). One set may be flagged the `catchAll`,
 * which collects traceables that match no other set's pattern; a
 * catch-all needs no pattern of its own.
 */
export type SpecSetMatcher = {
  name: string;
  pattern?: string;
  catchAll?: boolean;
};

/** Where each kind of artifact lives, and the structural-kind prefixes (ENT-002). */
export type Layout = {
  stories: { dir: string; prefix: string };
  derivedSpecs: { dir: string };
  entities: { file: string; prefix: string };
  drafts: { dir: string };
  state: { file: string };
};

/** The default layout — the opinionated template (ADR-0001 D8, ENT-002). */
export const DEFAULT_LAYOUT: Layout = {
  stories: { dir: "docs/spec/stories", prefix: "STR" },
  derivedSpecs: { dir: "docs/spec/derived-specs" },
  entities: { file: "docs/spec/domain-model.md", prefix: "ENT" },
  drafts: { dir: "docs/spec/drafts" },
  state: { file: ".ariadne/state.json" },
};

/**
 * Reads the `idGeneration` section from `.ariadnerc.json`.
 * A missing file, section, or value falls back to the default.
 */
export async function readIdGenerationConfig(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<IdGenerationConfig> {
  const idGeneration = asObject((await readRawConfig(file)).idGeneration);
  const mode = idGeneration.mode === "opaque" ? "opaque" : DEFAULT_MODE;
  const padding =
    typeof idGeneration.padding === "number"
      ? idGeneration.padding
      : DEFAULT_PADDING;
  return { mode, padding };
}

/**
 * Reads the `lenses` section: the project's derived-spec kinds (ADR-0003).
 * A missing or empty section falls back to the default lens set.
 */
export async function readLenses(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<Lens[]> {
  const raw = (await readRawConfig(file)).lenses;
  if (!Array.isArray(raw)) {
    return [...DEFAULT_LENSES];
  }
  const lenses = raw
    .map(asObject)
    .filter(
      (lens) =>
        typeof lens.id === "string" && typeof lens.description === "string",
    )
    .map((lens) => ({
      id: lens.id as string,
      description: lens.description as string,
    }));
  return lenses.length > 0 ? lenses : [...DEFAULT_LENSES];
}

/**
 * Reads the `layout` section: where each kind of artifact lives (ENT-002).
 * Each value falls back to its default independently.
 */
export async function readLayout(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<Layout> {
  const layout = asObject((await readRawConfig(file)).layout);
  const stories = asObject(layout.stories);
  const derivedSpecs = asObject(layout.derivedSpecs);
  const entities = asObject(layout.entities);
  const drafts = asObject(layout.drafts);
  const state = asObject(layout.state);
  return {
    stories: {
      dir: asString(stories.dir, DEFAULT_LAYOUT.stories.dir),
      prefix: asString(stories.prefix, DEFAULT_LAYOUT.stories.prefix),
    },
    derivedSpecs: {
      dir: asString(derivedSpecs.dir, DEFAULT_LAYOUT.derivedSpecs.dir),
    },
    entities: {
      file: asString(entities.file, DEFAULT_LAYOUT.entities.file),
      prefix: asString(entities.prefix, DEFAULT_LAYOUT.entities.prefix),
    },
    drafts: { dir: asString(drafts.dir, DEFAULT_LAYOUT.drafts.dir) },
    state: { file: asString(state.file, DEFAULT_LAYOUT.state.file) },
  };
}

/**
 * The set of valid id prefixes: the lens ids plus the structural-kind prefixes
 * for stories and entities (ADR-0003). This is the single source of truth that
 * mint validates a prefix against and init filters discovered ids by.
 */
export async function readConfiguredPrefixes(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<Set<string>> {
  const [lenses, layout] = await Promise.all([
    readLenses(file),
    readLayout(file),
  ]);
  const prefixes = new Set(lenses.map((lens) => lens.id));
  prefixes.add(layout.stories.prefix);
  prefixes.add(layout.entities.prefix);
  return prefixes;
}

/** A configured generator with its output directory resolved (ENT-002). */
export type ResolvedGenerator = {
  type: string;
  /** Where it writes, relative to the project root: the configured `outputDir` or the generator's own default. */
  outputDir: string;
};

/**
 * The project's configuration, fully resolved: every default applied and every
 * derivation computed, so a caller reads the answer without knowing a default.
 */
export type ResolvedConfiguration = {
  lenses: Lens[];
  /** The valid id prefixes: the lens ids plus the story and entity prefixes (ADR-0003). */
  prefixes: string[];
  layout: Layout;
  generators: ResolvedGenerator[];
};

export type ResolveConfigurationOptions = {
  /**
   * Resolves a configured generator name to its implementation, so a generator's
   * default output directory can be read through the generator interface
   * (ARCH-003). Injecting it keeps the core free of any concrete generator
   * (ADR-0001 D9).
   */
  resolveGenerator: (name: string) => Generator | undefined;
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
};

/**
 * Resolves the project configuration into a single view (SW-019).
 * It composes the independently-defaulted section readers — the lenses, the
 * layout, and the derived prefixes (ADR-0003) — with each configured generator's
 * resolved output directory: the configured `outputDir`, or, when absent, the
 * generator's own default read through the generator interface (ARCH-003). The
 * generators are injected, so the core resolves the view without depending on
 * any concrete generator.
 */
export const resolveConfiguration: (
  options: ResolveConfigurationOptions,
) => Promise<ResolvedConfiguration> = realizes(
  SwTraceables.SW_019_RESOLVE_CONFIGURATION,
  async (
    options: ResolveConfigurationOptions,
  ): Promise<ResolvedConfiguration> => {
    const { configFile, resolveGenerator } = options;
    const [lenses, prefixes, layout, generatorConfigs] = await Promise.all([
      readLenses(configFile),
      readConfiguredPrefixes(configFile),
      readLayout(configFile),
      readGenerators(configFile),
    ]);
    const generators = generatorConfigs.map((config) => ({
      type: config.type,
      outputDir: resolveOutputDir(config, resolveGenerator),
    }));
    return { lenses, prefixes: [...prefixes], layout, generators };
  },
);

/**
 * Resolves a configured generator's output directory: the configured `outputDir`
 * when set, otherwise the generator's own default — the same rule the `spec`
 * command applies (SW-014). The generator is only consulted when no directory is
 * configured; a configured generator that resolves to nothing fails fast with a
 * stable code.
 */
function resolveOutputDir(
  config: GeneratorConfig,
  resolveGenerator: (name: string) => Generator | undefined,
): string {
  if (config.outputDir !== undefined) {
    return config.outputDir;
  }
  const generator = resolveGenerator(config.type);
  if (generator === undefined) {
    throw new AriadneError(
      ErrorCode.UNKNOWN_GENERATOR,
      `Configured generator "${config.type}" is not registered; remove it from \`generators\` or install a generator that provides it.`,
    );
  }
  return generator.defaultOutputDir;
}

/**
 * Reads the `generators` section: the language generators to run, each with its
 * target-language `type` and an optional `outputDir`. An entry may be a
 * bare type string (shorthand for `{ type }`) or an object. Each type is resolved
 * to a concrete generator outside the core, so the core never depends on a
 * concrete generator. A missing section yields an empty list — nothing
 * to generate.
 */
export async function readGenerators(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<GeneratorConfig[]> {
  const raw = (await readRawConfig(file)).generators;
  if (!Array.isArray(raw)) {
    return [];
  }
  const generators: GeneratorConfig[] = [];
  for (const entry of raw) {
    const generator = toGeneratorConfig(entry);
    if (generator !== undefined) {
      generators.push(generator);
    }
  }
  return generators;
}

/** Normalizes a `generators` entry — a bare type string or an object — to a `GeneratorConfig`. */
function toGeneratorConfig(entry: unknown): GeneratorConfig | undefined {
  if (typeof entry === "string") {
    return { type: entry };
  }
  const object = asObject(entry);
  if (typeof object.type !== "string") {
    return undefined;
  }
  const generator: GeneratorConfig = { type: object.type };
  // An empty string is treated as unset, so the generator's default applies.
  if (typeof object.outputDir === "string" && object.outputDir.length > 0) {
    generator.outputDir = object.outputDir;
  }
  return generator;
}

/**
 * Reads the `specSets` section: the configured spec-set matchers, in order
 * Each entry carries a `name`, an optional `pattern` (a regex over the
 * filename), and an optional `catchAll` flag. A missing or empty section yields
 * an empty list, which the `spec` command reads as "group by lens" (the default).
 */
export async function readSpecSets(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<SpecSetMatcher[]> {
  const raw = (await readRawConfig(file)).specSets;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw
    .map(asObject)
    .filter((set) => typeof set.name === "string")
    .map((set) => ({
      name: set.name as string,
      ...(typeof set.pattern === "string" ? { pattern: set.pattern } : {}),
      ...(set.catchAll === true ? { catchAll: true } : {}),
    }));
}

/**
 * Reads the `ignore` section: regular expressions over a spec's filename whose
 * matching traceables are excluded from every spec set. A missing
 * section yields an empty list — nothing is excluded.
 */
export async function readIgnore(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<string[]> {
  const raw = (await readRawConfig(file)).ignore;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (pattern): pattern is string => typeof pattern === "string",
  );
}

/** Reads a section that is a list of glob strings; a missing section yields an empty list. */
async function readGlobList(
  file: string,
  section: "exclude" | "unexclude",
): Promise<string[]> {
  const raw = (await readRawConfig(file))[section];
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter(
    (pattern): pattern is string => typeof pattern === "string",
  );
}

/**
 * Reads the `exclude` section: the project's scan exclusion globs (SW-025).
 * A missing section yields an empty list — no configured exclusions.
 */
export async function readExclude(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<string[]> {
  return readGlobList(file, "exclude");
}

/**
 * Reads the `unexclude` section: globs that re-include paths a built-in default
 * would exclude (SW-025). A missing section yields an empty list.
 */
export async function readUnexclude(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<string[]> {
  return readGlobList(file, "unexclude");
}

/** Whether a configuration file exists at `file`. */
export async function configExists(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

/**
 * Asserts a project configuration is present. When it is absent, fails
 * with a stable code and directs the user to `clew setup`. This is the
 * command-level precondition; the readers above still default an absent value
 * within a present configuration.
 */
export const requireConfig: (file?: string) => Promise<void> = realizes(
  ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG,
  async (file: string = DEFAULT_CONFIG_FILE): Promise<void> => {
    if (!(await configExists(file))) {
      throw new AriadneError(
        ErrorCode.NO_CONFIG,
        `No configuration found at ${file}. Run \`clew setup\` to create one.`,
      );
    }
  },
);

/** Reads and parses `.ariadnerc.json`; a missing file resolves to an empty config. */
const readRawConfig = realizes(
  SwTraceables.SW_009_READ_CONFIGURATION,
  async (file: string): Promise<Record<string, unknown>> => {
    let raw: string;
    try {
      raw = await readFile(file, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return {};
      }
      throw error;
    }
    return JSON.parse(raw) as Record<string, unknown>;
  },
);

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
