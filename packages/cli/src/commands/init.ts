import { init, requireConfig } from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";

/**
 * Registers the `clew init` command surface.
 * The action stays thin: it delegates discovery and reconciliation to core's
 * `init()`, which reads the artifact locations from configuration,
 * and reports what it recorded to stdout. Any error propagates to the
 * bin entry, which writes it to stderr and exits non-zero.
 */
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
