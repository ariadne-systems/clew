import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import {
  configExists,
  DEFAULT_CONFIG_FILE,
  DEFAULT_LAYOUT,
  DEFAULT_LENSES,
  DEFAULT_MODE,
  DEFAULT_PADDING,
} from "./config.js";

export type SetupOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
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
};

/**
 * Scaffolds the default configuration and layout: writes
 * `.clewrc.json` with the default lenses and layout and creates the
 * configured layout directories, relative to the configuration's directory.
 * An existing configuration is never overwritten, so setup is safe to
 * re-run.
 */
export const setup: (options?: SetupOptions) => Promise<SetupResult> = realizes(
  [
    SwTraceables.SW_011_SCAFFOLD_DEFAULT_CONFIG,
    ConTraceables.CON_010_SETUP_NEVER_OVERWRITES,
  ],
  async (options: SetupOptions = {}): Promise<SetupResult> => {
    const configFile = options.configFile ?? DEFAULT_CONFIG_FILE;
    if (await configExists(configFile)) {
      return { created: false, configFile, directories: [], lenses: [] };
    }
    const root = dirname(configFile);
    const directories = [
      DEFAULT_LAYOUT.stories.dir,
      DEFAULT_LAYOUT.specs.dir,
      DEFAULT_LAYOUT.drafts.dir,
    ];
    // Create the layout directories before writing the config, so a config on disk
    // always implies a complete scaffold: if a mkdir fails, no config is written, and
    // a re-run starts clean rather than short-circuiting on a half-made project.
    for (const dir of directories) {
      await mkdir(join(root, dir), { recursive: true });
    }
    const config = {
      idGeneration: { mode: DEFAULT_MODE, padding: DEFAULT_PADDING },
      lenses: DEFAULT_LENSES,
      layout: DEFAULT_LAYOUT,
    };
    await writeFile(configFile, `${JSON.stringify(config, null, 2)}\n`, "utf8");
    return {
      created: true,
      configFile,
      directories,
      lenses: DEFAULT_LENSES.map((lens) => lens.id),
    };
  },
);
