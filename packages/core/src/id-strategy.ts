import type { ArchTraceables, Realizes } from "@ariadne-thread/trace";

/**
 * The seam for generating an id's variable part.
 * The scheme — sequential, opaque, or another later — is chosen by
 * configuration and implemented behind this interface. The minting code
 * depends on this interface, never on a concrete strategy.
 */
export interface IdStrategy
  extends Realizes<ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY, unknown> {
  /** Mints `count` ids for the given type/prefix. */
  mint(type: string, count: number): Promise<string[]>;
}
