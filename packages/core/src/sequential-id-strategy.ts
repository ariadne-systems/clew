import { SwTraceables, traces } from "@ariadne-thread/trace";
import { AriadneError, ErrorCode } from "./errors.js";
import type { IdStrategy } from "./id-strategy.js";
import { withState } from "./state.js";

export type SequentialIdStrategyOptions = {
  /** Width to which numbers are zero-padded; sourced from configuration (CON-003). */
  padding: number;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
};

/**
 * Sequential id scheme (SW-002): renders ids as `<PREFIX>-<zero-padded number>`,
 * with the numbers drawn from the per-prefix sequence allocator (SW-001).
 */
@traces(SwTraceables.SW_002_MINT_SEQUENTIAL_IDS)
export class SequentialIdStrategy implements IdStrategy {
  readonly #padding: number;
  readonly #stateFile: string | undefined;

  constructor(options: SequentialIdStrategyOptions) {
    this.#padding = options.padding;
    this.#stateFile = options.stateFile;
  }

  async mint(type: string, count: number): Promise<string[]> {
    if (!Number.isInteger(count) || count < 1) {
      throw new AriadneError(
        ErrorCode.INVALID_COUNT,
        `Mint count must be a positive integer, got ${count}.`,
      );
    }
    // Allocate inside the locked session; the high-water mark is persisted so a
    // number is never reused (SW-001, CON-002). withState saves before it
    // resolves, so the numbers are only formatted and returned once the advance
    // is durably persisted (CON-004).
    const numbers = await withState(
      (state) => allocateConsecutive(state.sequences, type, count),
      { file: this.#stateFile },
    );
    return numbers.map((number) => `${type}-${this.#render(number)}`);
  }

  #render(number: number): string {
    return String(number).padStart(this.#padding, "0");
  }
}

/**
 * Allocates `count` consecutive numbers for `prefix` and advances its
 * high-water mark (SW-001). A prefix used for the first time begins at 1.
 */
const allocateConsecutive = traces(
  SwTraceables.SW_001_ALLOCATE_SEQUENCE_NUMBERS,
  (
    sequences: Record<string, number>,
    prefix: string,
    count: number,
  ): number[] => {
    const highWaterMark = sequences[prefix] ?? 0;
    const allocated = Array.from(
      { length: count },
      (_unused, offset) => highWaterMark + 1 + offset,
    );
    sequences[prefix] = highWaterMark + count;
    return allocated;
  },
);
