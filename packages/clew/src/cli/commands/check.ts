import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import {
  check,
  createGeneratorRegistry,
  formatCheckReport,
  requireConfig,
} from "../../index.js";

/**
 * Registers the `clew check` command surface. Thin: it requires a
 * configuration, runs the integrity-check suite in core, prints the report, and
 * exits non-zero when any check fails — so it runs the same in pre-commit, CI, or
 * an agent's loop. Any error propagates to the bin entry, which writes it to
 * stderr and exits non-zero.
 */
export const registerCheck: (program: Command) => void = realizes(
  SwTraceables.SW_034_CHECK_COMMAND,
  (program: Command): void => {
    program
      .command("check")
      .description(
        "Run the deterministic integrity-check suite over the corpus.",
      )
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const registry = createGeneratorRegistry();
        const result = await check({
          resolveGenerator: (name) => registry.get(name),
        });
        if (result.findings.length === 0) {
          process.stdout.write(formatCheckReport(result));
          return;
        }
        process.stderr.write(formatCheckReport(result));
        process.exitCode = 1;
      });
  },
);
