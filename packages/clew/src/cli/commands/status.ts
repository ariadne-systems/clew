import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { readStoryStatuses, requireConfig } from "../../index.js";

/** Registers the `clew status` command — lists each story with its declared implementation status, delegating the read to core. */
export const registerStatus: (program: Command) => void = realizes(
  SwTraceables.SW_050_STATUS_COMMAND,
  (program: Command): void => {
    program
      .command("status")
      .description("List each story with its declared implementation status.")
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const states = await readStoryStatuses();
        if (states.length === 0) {
          process.stdout.write("No stories found.\n");
          return;
        }
        for (const { file, status } of states) {
          process.stdout.write(`${status.padEnd(8)}${file}\n`);
        }
      });
  },
);
