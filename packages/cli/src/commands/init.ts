import { init, requireConfig } from "@ariadne-thread/core";
import { SwTraceables, traces } from "@ariadne-thread/trace";
import type { Command } from "commander";

/**
 * Registers the `ariadne init` command surface (STR-008).
 * The action stays thin: it delegates discovery and reconciliation to core's
 * `init()`, which reads the artifact locations from configuration
 * (ENT-002), and reports what it recorded to stdout. Any error propagates to the
 * bin entry, which writes it to stderr and exits non-zero.
 */
export const registerInit: (program: Command) => void = traces(
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
