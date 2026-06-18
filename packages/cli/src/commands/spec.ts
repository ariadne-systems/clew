import { requireConfig, spec } from "@ariadne-thread/core";
import type { Command } from "commander";
import { createGeneratorRegistry } from "../generators.js";

/**
 * Registers the `ariadne spec` command surface (SW-012; STR-011).
 * The action stays thin: it requires a configuration (CON-011), builds the
 * generator registry — the CLI is the composition root that maps configured
 * generator names to their implementations (ARCH-003) — and delegates scanning
 * and generation to core's `spec()`, which drives the configured generators
 * through the generator interface (SW-013, SW-014). It then reports what was
 * produced to stdout. Any error propagates to the bin entry, which writes it to
 * stderr and exits non-zero.
 */
export function registerSpec(program: Command): void {
  program
    .command("spec")
    .description("Generate traceables and anchoring utilities from the specs.")
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
      for (const { name, files } of result.generators) {
        for (const file of files) {
          process.stdout.write(`${name}: ${file}\n`);
        }
      }
    });
}
