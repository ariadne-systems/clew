import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { promote, requireConfig } from "../../index.js";

/**
 * Registers the `clew promote` command surface.
 * The action stays thin: it requires a configuration and delegates the mechanical
 * finalize to core's `promote()`, then reports each temporary-id → bound-id mapping
 * to stdout. At least one root — a story or spec, or `all` — is required; commander
 * rejects the no-argument form. Any error propagates to the bin entry, which writes
 * it to stderr and exits non-zero. Integration reasoning stays with the
 * `clew-promote` skill, not here.
 */
export const registerPromote: (program: Command) => void = realizes(
  SwTraceables.SW_016_PROMOTE_COMMAND,
  (program: Command): void => {
    program
      .command("promote")
      .description("Finalize a story (and its specs) into the spec tree.")
      .argument(
        "<roots...>",
        "the story or spec to promote (temporary id or path), or 'all' for every pending draft",
      )
      .action(async (roots: string[]) => {
        await requireConfig();
        const { promoted } = await promote({ roots });
        if (promoted.length === 0) {
          process.stdout.write("No pending drafts to promote.\n");
          return;
        }
        for (const { temporaryId, boundId, to } of promoted) {
          process.stdout.write(`${temporaryId} -> ${boundId}  (${to})\n`);
        }
      });
  },
);
