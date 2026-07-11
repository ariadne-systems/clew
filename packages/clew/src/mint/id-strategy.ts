import type { ArchTraceables, Realizes } from "@ariadne-thread/trace";

/** The seam for generating an id's variable part; the scheme is chosen by configuration and implemented behind this interface. */
export interface IdStrategy
  extends Realizes<ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY, unknown> {
  /** Mints `count` ids for the given type/prefix. */
  mint(type: string, count: number): Promise<string[]>;
}
