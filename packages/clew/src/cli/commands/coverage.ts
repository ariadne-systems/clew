import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import {
  coverage,
  coverageOf,
  formatCoverageReport,
  requireConfig,
} from "../../index.js";

const EMPTY_UNIVERSE_NOTE =
  "note: the coverage universe is empty — no generated traceables were found. If you have active specs, run `clew spec` first (coverage reads the generated trace, not the spec files); with none yet, this is the expected state.\n";

/** Notes, on stderr, when the coverage universe is empty — expected with no active specs, a `clew spec` reminder otherwise. */
function noteEmptyUniverse(universeEmpty: boolean): void {
  if (universeEmpty) {
    process.stderr.write(EMPTY_UNIVERSE_NOTE);
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
          noteEmptyUniverse(universeEmpty);
          process.stdout.write(report);
          return;
        }
        const { result, file, universeEmpty } = await coverage();
        noteEmptyUniverse(universeEmpty);
        process.stdout.write(formatCoverageReport(result));
        process.stdout.write(`Wrote ${file}.\n`);
      });
  },
);
