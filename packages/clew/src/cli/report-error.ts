import { realizes, SwTraceables } from "@ariadne-thread/trace";
import { ClewError } from "../index.js";

/** Formats a failure for stderr in the compiler-diagnostic convention (`error[<CODE>]:`, `--> location`, `= note:` / `= help:`). */
export const formatError: (error: unknown) => string = realizes(
  SwTraceables.SW_004_ERROR_REPORTING,
  (error: unknown): string => {
    if (error instanceof ClewError) {
      const lines = [`error[${error.code}]: ${error.message}`];
      if (error.location !== undefined) {
        lines.push(`  --> ${error.location}`);
      }
      if (error.note !== undefined) {
        lines.push(`  = note: ${error.note}`);
      }
      const helps =
        error.help === undefined
          ? []
          : Array.isArray(error.help)
            ? error.help
            : [error.help];
      for (const help of helps) {
        lines.push(`  = help: ${help}`);
      }
      return lines.join("\n");
    }
    return error instanceof Error ? error.message : String(error);
  },
);
