import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { init, requireConfig } from "../../index.js";

/** Registers the `clew init` command surface. */
export const registerInit: (program: Command) => void = realizes(
  SwTraceables.SW_007_INIT_COMMAND,
  (program: Command): void => {
    program
      .command("init")
      .description("Initialize the StateStore from existing artifacts.")
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const { raised } = await init();
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
