import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { coverage, formatCoverageReport, requireConfig } from "../../index.js";

/** Registers the `clew coverage` command surface. Always exits 0 — the report is informational. */
export const registerCoverage: (program: Command) => void = realizes(
  SwTraceables.SW_029_COVERAGE_COMMAND,
  (program: Command): void => {
    program
      .command("coverage")
      .description("Report which specs the code covers.")
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const { result, file, universeEmpty } = await coverage();
        if (universeEmpty) {
          process.stderr.write(
            "warning: no generated traceables found — run `clew spec` first; coverage is reported against the generated trace, not the spec files.\n",
          );
        }
        process.stdout.write(formatCoverageReport(result));
        process.stdout.write(`Wrote ${file}.\n`);
      });
  },
);
