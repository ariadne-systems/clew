import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import {
  coverage,
  coverageOf,
  formatCoverageReport,
  requireConfig,
} from "../../index.js";

const EMPTY_UNIVERSE_WARNING =
  "warning: no generated traceables found — run `clew spec` first; coverage is reported against the generated trace, not the spec files.\n";

/** Warns, on stderr, when the coverage universe is empty — the generator has not run. */
function warnEmptyUniverse(universeEmpty: boolean): void {
  if (universeEmpty) {
    process.stderr.write(EMPTY_UNIVERSE_WARNING);
  }
}

/** Registers the `clew coverage` command surface. Always exits 0 — the report is informational. */
export const registerCoverage: (program: Command) => void = realizes(
  [
    SwTraceables.SW_029_COVERAGE_COMMAND,
    SwTraceables.SW_051_COVERAGE_REPORTS_NAMED_SPECS,
  ],
  (program: Command): void => {
    program
      .command("coverage")
      .description("Report which specs the code covers.")
      .argument(
        "[ids...]",
        "spec ids to report; omit to report the whole corpus and write coverage.json",
      )
      .action(async (ids: string[]) => {
        await requireConfig();
        if (ids.length > 0) {
          const { report, universeEmpty } = await coverageOf(ids);
          warnEmptyUniverse(universeEmpty);
          process.stdout.write(report);
          return;
        }
        const { result, file, universeEmpty } = await coverage();
        warnEmptyUniverse(universeEmpty);
        process.stdout.write(formatCoverageReport(result));
        process.stdout.write(`Wrote ${file}.\n`);
      });
  },
);
