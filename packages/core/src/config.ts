import { readFile } from "node:fs/promises";

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

/**
 * Reads the `idGeneration` section from `.ariadnerc.json`.
 * A missing file or section falls back to the defaults; the padding width is
 * never hard-coded in the minting code, only sourced here (CON-003).
 */
export async function readIdGenerationConfig(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<IdGenerationConfig> {
  const idGeneration = await readConfigSection(file, "idGeneration");
  const mode = idGeneration.mode === "opaque" ? "opaque" : DEFAULT_MODE;
  const padding =
    typeof idGeneration.padding === "number"
      ? idGeneration.padding
      : DEFAULT_PADDING;
  return { mode, padding };
}

/**
 * Reads `idToken.pattern` from `.ariadnerc.json`, or `undefined` if no pattern
 * is configured. Sourcing the pattern here keeps it out of the minting code (CON-005).
 */
export async function readIdTokenPattern(
  file: string = DEFAULT_CONFIG_FILE,
): Promise<string | undefined> {
  const idToken = await readConfigSection(file, "idToken");
  return typeof idToken.pattern === "string" ? idToken.pattern : undefined;
}

async function readConfigSection(
  file: string,
  section: string,
): Promise<Record<string, unknown>> {
  let raw: string;
  try {
    raw = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return {};
    }
    throw error;
  }
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const value = parsed[section];
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}
