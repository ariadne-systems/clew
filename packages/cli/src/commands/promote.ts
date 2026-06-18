import { promote, requireConfig } from "@ariadne-thread/core";
import type { Command } from "commander";

/**
 * Registers the `ariadne promote` command surface (SW-016; STR-013).
 * The action stays thin: it requires a configuration (CON-011) and delegates the
 * mechanical finalize — bind each draft's id, substitute its temporary id
 * project-wide, move it into the layout — to core's `promote()` (SW-017). It then
 * reports each temporary-id → bound-id mapping to stdout. Any error propagates to
 * the bin entry, which writes it to stderr and exits non-zero. Integration
 * reasoning stays with the `ariadne-promote` skill, not here.
 */
export function registerPromote(program: Command): void {
  program
    .command("promote")
    .description("Finalize reviewed drafts into the spec tree.")
    .argument(
      "[drafts...]",
      "drafts to finalize (temporary id or path); omit to finalize all pending",
    )
    .action(async (drafts: string[]) => {
      await requireConfig();
      const { promoted } = await promote({ drafts });
      if (promoted.length === 0) {
        process.stdout.write("No pending drafts to promote.\n");
        return;
      }
      for (const { temporaryId, boundId, to } of promoted) {
        process.stdout.write(`${temporaryId} -> ${boundId}  (${to})\n`);
      }
    });
}
