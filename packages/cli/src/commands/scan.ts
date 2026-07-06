import {
  requireConfig,
  scanCode,
  writeLocationsIndex,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { createGeneratorRegistry } from "../generators.js";

/**
 * Registers the `clew scan` command surface — the *check* side, dual to
 * `spec` (the *declare* side). The action stays thin: it requires a configuration,
 * builds the generator registry, and delegates to core's `scanCode()`, which
 * drives each generator's discover through the interface. It reports the located
 * anchors to stdout and writes the locations index. Any error propagates to the
 * bin entry, which writes it to stderr and exits non-zero.
 */
export const registerScan: (program: Command) => void = realizes(
  SwTraceables.SW_023_SCAN_COMMAND,
  (program: Command): void => {
    program
      .command("scan")
      .description(
        "Scan the code for its anchors and write the locations index.",
      )
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const registry = createGeneratorRegistry();
        const result = await scanCode({
          resolveGenerator: (name) => registry.get(name),
        });
        const indexFile = await writeLocationsIndex(result);
        process.stdout.write(
          `Found ${result.anchors.length} anchors; wrote ${indexFile}.\n`,
        );
        for (const { id, relation, file, line } of result.anchors) {
          process.stdout.write(`  ${id} ${relation} ${file}:${line}\n`);
        }
      });
  },
);
