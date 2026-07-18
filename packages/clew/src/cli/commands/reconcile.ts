import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { reconcile, requireConfig } from "../../index.js";

/** Registers the `clew reconcile` command surface. */
export const registerReconcile: (program: Command) => void = realizes(
  SwTraceables.SW_007_RECONCILE_COMMAND,
  (program: Command): void => {
    program
      .command("reconcile")
      .description("Reconcile the id state with the ids already on disk.")
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const { raised } = await reconcile();
        if (raised.length === 0) {
          process.stdout.write(
            "State already covers all artifacts; nothing changed.\n",
          );
          return;
        }
        for (const { prefix, from, to } of raised) {
          process.stdout.write(`${prefix}: ${from} -> ${to}\n`);
        }
      });
  },
);
