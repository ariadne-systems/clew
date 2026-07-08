import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { requireConfig, spec } from "../../index.js";

/**
 * Registers the `clew spec` command surface.
 * The action stays thin: it requires a configuration and delegates scanning and
 * generation to core's `spec()`, which resolves the configured generators from
 * the engine's registry and drives them through the generator interface. It then
 * reports what was produced to stdout. Any error propagates to the bin entry,
 * which writes it to stderr and exits non-zero.
 */
export const registerSpec: (program: Command) => void = realizes(
  SwTraceables.SW_012_SPEC_COMMAND,
  (program: Command): void => {
    program
      .command("spec")
      .description(
        "Generate traceables and anchoring utilities from the specs.",
      )
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const result = await spec();
        process.stdout.write(
          `Scanned ${result.traceableCount} traceables in ${result.specSetCount} spec sets.\n`,
        );
        if (result.generators.length === 0) {
          process.stdout.write("No generators configured; nothing emitted.\n");
          return;
        }
        for (const { name, outputDir, files } of result.generators) {
          process.stdout.write(
            `  ${name} -> ${outputDir}: ${files.join(", ")}\n`,
          );
        }
      });
  },
);
