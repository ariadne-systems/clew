import { init } from "@ariadne-thread/core";
import type { Command } from "commander";

/** The conventional location of a project's spec artifacts. */
const ARTIFACTS_DIR = "docs/spec";

/**
 * Registers the `ariadne init` command surface (SW-007; STR-008).
 * The action stays thin: it delegates discovery and reconciliation to core's
 * `init()` (SW-006) and reports what it recorded to stdout. Any error propagates
 * to the bin entry, which writes it to stderr and exits non-zero.
 */
export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Initialize the StateStore from existing artifacts.")
    .allowExcessArguments(false)
    .action(async () => {
      const { raised } = await init({ artifactsDir: ARTIFACTS_DIR });
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
}
