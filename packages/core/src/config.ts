import { readFile, stat } from "node:fs/promises";
import { AriadneError, ErrorCode } from "./errors.js";

/** Default location of the project configuration file. */
export const DEFAULT_CONFIG_FILE = ".ariadnerc.json";

/** Default zero-padding width when the configuration does not state one (CON-003). */
export const DEFAULT_PADDING = 3;

/** Default id-generation scheme when the configuration does not state one (ARCH-001). */
export const DEFAULT_MODE: IdGenerationMode = "sequential";

/** The id-generation scheme chosen by configuration (ARCH-001). */
export type IdGenerationMode = "sequential" | "opaque";

/** The `idGeneration` section of `.ariadnerc.json` (CON-003, ARCH-001). */
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
 * a spec's filename (SW-015, ENT-002). One set may be flagged the `catchAll`,
 * which collects traceables that match no other set's pattern (CON-013); a
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
 * Reads the `idGeneration` section from `.ariadnerc.json` (CON-003, ARCH-001).
 * A missing file, section, or value falls back to the default (SW-009).
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
 * A missing or empty section falls back to the default lens set (SW-009).
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
 * Each value falls back to its default independently (SW-009).
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

/**
 * Reads the `generators` section: the language generators to run, by name
 * (SW-014). Each name is resolved to a concrete generator outside the core, so
 * the core never depends on a concrete generator (ARCH-003). A missing section
 * yields an empty list — nothing to generate.
 */
export async function readGenerators(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<string[]> {
  const raw = (await readRawConfig(file)).generators;
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((name): name is string => typeof name === "string");
}

/**
 * Reads the `specSets` section: the configured spec-set matchers, in order
 * (SW-015). Each entry carries a `name`, an optional `pattern` (a regex over the
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
 * matching traceables are excluded from every spec set (CON-013). A missing
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
 * Asserts a project configuration is present (CON-011). When it is absent, fails
 * with a stable code and directs the user to `ariadne setup`. This is the
 * command-level precondition; the readers above still default an absent value
 * within a present configuration.
 */
export async function requireConfig(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<void> {
  if (!(await configExists(file))) {
    throw new AriadneError(
      ErrorCode.NO_CONFIG,
      `No configuration found at ${file}. Run \`ariadne setup\` to create one.`,
    );
  }
}

/** Reads and parses `.ariadnerc.json`; a missing file resolves to an empty config. */
async function readRawConfig(file: string): Promise<Record<string, unknown>> {
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
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" ? value : fallback;
}
