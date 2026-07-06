import { requireConfig, spec } from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { createGeneratorRegistry } from "../generators.js";

/**
 * Registers the `clew spec` command surface.
 * The action stays thin: it requires a configuration, builds the
 * generator registry — the CLI is the composition root that maps configured
 * generator names to their implementations — and delegates scanning
 * and generation to core's `spec()`, which drives the configured generators
 * through the generator interface. It then reports what was
 * produced to stdout. Any error propagates to the bin entry, which writes it to
 * stderr and exits non-zero.
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
        const registry = createGeneratorRegistry();
        const result = await spec({
          resolveGenerator: (name) => registry.get(name),
        });
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
