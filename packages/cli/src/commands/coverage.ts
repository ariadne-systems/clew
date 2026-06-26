import {
  computeCoverage,
  formatCoverageReport,
  readUniverse,
  readWaivers,
  reconcileWaivers,
  requireConfig,
  scanCode,
  writeCoverageResult,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { createGeneratorRegistry } from "../generators.js";

/**
 * Registers the `clew coverage` command surface (SW-029). The action stays thin:
 * it requires a configuration, gathers the universe (the generated traceables,
 * read back through the configured generators), the code anchors (the
 * generator-driven code scan), and the committed waivers, then
 * delegates to core to compute coverage, reconcile the waivers, and write
 * `coverage.json`. It prints the report and is **informational** — it always
 * exits 0, whether or not gaps exist; the pass/fail gate is a later story. Any
 * error propagates to the bin entry, which writes it to stderr and exits non-zero.
 */
export const registerCoverage: (program: Command) => void = realizes(
  SwTraceables.SW_029_COVERAGE_COMMAND,
  (program: Command): void => {
    program
      .command("coverage")
      .description("Report which specs the code covers.")
      .allowExcessArguments(false)
      .action(async () => {
        await requireConfig();
        const registry = createGeneratorRegistry();
        const [universe, scanResult, waivers] = await Promise.all([
          readUniverse({ resolveGenerator: (name) => registry.get(name) }),
          scanCode({ resolveGenerator: (name) => registry.get(name) }),
          readWaivers(),
        ]);
        if (universe.length === 0) {
          process.stderr.write(
            "warning: no generated traceables found — run `clew spec` first; coverage is reported against the generated trace, not the spec files.\n",
          );
        }
        const coverage = computeCoverage(universe, scanResult.anchors);
        const result = reconcileWaivers(coverage, waivers);
        const file = await writeCoverageResult(result);
        process.stdout.write(formatCoverageReport(result));
        process.stdout.write(`Wrote ${file}.\n`);
      });
  },
);
