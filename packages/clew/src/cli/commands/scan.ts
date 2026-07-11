import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { requireConfig, scanCode, writeLocationsIndex } from "../../index.js";

/** Registers the `clew scan` command surface — the *check* side, dual to `spec` (the *declare* side). */
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
        const result = await scanCode();
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
