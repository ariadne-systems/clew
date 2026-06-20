import { AriadneError } from "@ariadne-thread/core";
import { SwTraceables, traces } from "@ariadne-thread/trace";

/**
 * Formats a failure for stderr. A coded failure is rendered as
 * `error[<CODE>]: <message>` so a consumer can identify it by its stable code
 * without parsing the prose; any other error falls back to its message.
 */
export const formatError: (error: unknown) => string = traces(
  SwTraceables.SW_004_ERROR_REPORTING,
  (error: unknown): string => {
    if (error instanceof AriadneError) {
      return `error[${error.code}]: ${error.message}`;
    }
    return error instanceof Error ? error.message : String(error);
  },
);
