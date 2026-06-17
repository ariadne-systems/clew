import { AriadneError } from "@ariadne-thread/core";

/**
 * Formats a failure for stderr (SW-004). A coded failure is rendered as
 * `error[<CODE>]: <message>` so a consumer can identify it by its stable code
 * without parsing the prose; any other error falls back to its message.
 */
export function formatError(error: unknown): string {
  if (error instanceof AriadneError) {
    return `error[${error.code}]: ${error.message}`;
  }
  return error instanceof Error ? error.message : String(error);
}
