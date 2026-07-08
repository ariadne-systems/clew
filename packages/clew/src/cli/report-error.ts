import { realizes, SwTraceables } from "@ariadne-thread/trace";
import { AriadneError } from "../index.js";

/**
 * Formats a failure for stderr in the compiler-diagnostic convention. A coded
 * failure leads with `error[<CODE>]: <summary>` so a consumer can identify it by
 * its stable code without parsing the prose, followed — when present — by a
 * `--> location` pointer and `= note:` / `= help:` lines. A failure carrying none
 * of these renders as the single summary line; any other error falls back to its
 * message.
 */
export const formatError: (error: unknown) => string = realizes(
  SwTraceables.SW_004_ERROR_REPORTING,
  (error: unknown): string => {
    if (error instanceof AriadneError) {
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
