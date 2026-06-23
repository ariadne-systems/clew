import {
  computeCoverage,
  formatCoverageReport,
  readWaivers,
  reconcileWaivers,
  requireConfig,
  scan,
  scanCode,
  writeCoverageResult,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Command } from "commander";
import { createGeneratorRegistry } from "../generators.js";

/**
 * Registers the `clew coverage` command surface (SW-029). The action stays thin:
 * it requires a configuration, gathers the universe (the spec scan), the code
 * anchors (the generator-driven code scan), and the committed waivers, then
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
        const [traceables, scanResult, waivers] = await Promise.all([
          scan(),
          scanCode({ resolveGenerator: (name) => registry.get(name) }),
          readWaivers(),
        ]);
        const coverage = computeCoverage(traceables, scanResult.anchors);
        const result = reconcileWaivers(coverage, waivers);
        const file = await writeCoverageResult(result);
        process.stdout.write(formatCoverageReport(result));
        process.stdout.write(`Wrote ${file}.\n`);
      });
  },
);
