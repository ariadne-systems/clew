import { ArchTraceables, realizes } from "@ariadne-thread/trace";
import type { IdStrategy } from "./id-strategy.js";

/**
 * Opaque id scheme: recognised as a configurable strategy but not
 * yet implemented. It fails with an explicit message until its own story.
 */
@realizes(ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY)
export class OpaqueIdStrategy implements IdStrategy {
  mint(_type: string, _count: number): Promise<string[]> {
    throw new Error(
      'Opaque id generation is not yet implemented; configure idGeneration.mode as "sequential".',
    );
  }
}
