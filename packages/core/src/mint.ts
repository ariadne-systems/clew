import type { IdGenerationConfig } from "./config.js";
import { readIdGenerationConfig } from "./config.js";
import type { IdStrategy } from "./id-strategy.js";
import { OpaqueIdStrategy } from "./opaque-id-strategy.js";
import { SequentialIdStrategy } from "./sequential-id-strategy.js";

export type MintOptions = {
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
};

/**
 * Mints `count` ids for `type`, in the scheme selected by configuration (ARCH-001).
 * The minting code depends only on the IdStrategy interface; the concrete
 * strategy is chosen by `createIdStrategy`.
 */
export async function mint(
  type: string,
  count: number,
  options: MintOptions = {},
): Promise<string[]> {
  const config = await readIdGenerationConfig(options.configFile);
  const strategy = createIdStrategy(config, options.stateFile);
  return strategy.mint(type, count);
}

/** Selects the id strategy from configuration (ARCH-001). */
function createIdStrategy(
  config: IdGenerationConfig,
  stateFile: string | undefined,
): IdStrategy {
  if (config.mode === "opaque") {
    return new OpaqueIdStrategy();
  }
  return new SequentialIdStrategy({ padding: config.padding, stateFile });
}
