import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type {
  AnchorLocation,
  CoverageResult,
  SpecCoverage,
  Traceable,
} from "../index.js";
import {
  computeCoverage,
  formatCoverageReport,
  reconcileWaivers,
  writeCoverageResult,
} from "../index.js";

function traceable(id: string, lens: string): Traceable {
  return { id, lens, filename: `${id}.md` };
}

function anchor(
  id: string,
  relation: AnchorLocation["relation"],
): AnchorLocation {
  return { id, relation, file: "x.ts", line: 1 };
}

describe("computeCoverage", () => {
  verifies(
    [
      SwTraceables.SW_026_COMPUTE_COVERAGE,
      SysTraceables.SYS_002_REVERSE_TRACEABILITY_COVERAGE,
    ],
    () => {
      test("classifies each spec by realize and verify into the four statuses", () => {
        const traceables = [
          traceable("SW-1", "SW"),
          traceable("SW-2", "SW"),
          traceable("SW-3", "SW"),
          traceable("SW-4", "SW"),
        ];
        const anchors = [
          anchor("SW-1", "realizes"),
          anchor("SW-1", "verifies"),
          anchor("SW-2", "realizes"),
          anchor("SW-3", "verifies"),
        ];

        expect(computeCoverage(traceables, anchors)).toEqual([
          { id: "SW-1", lens: "SW", status: "covered" },
          { id: "SW-2", lens: "SW", status: "realized" },
          { id: "SW-3", lens: "SW", status: "verified" },
          { id: "SW-4", lens: "SW", status: "none" },
        ]);
      });
    },
  );

  verifies(ConTraceables.CON_019_CONCERNS_NOT_COVERAGE, () => {
    test("a concerns-only spec is None, and concerns never raises the status", () => {
      const traceables = [traceable("SW-1", "SW")];

      const concernsOnly = computeCoverage(traceables, [
        anchor("SW-1", "concerns"),
      ]);
      expect(concernsOnly[0]?.status).toBe("none");

      const withRealize = computeCoverage(traceables, [
        anchor("SW-1", "concerns"),
        anchor("SW-1", "realizes"),
      ]);
      expect(withRealize[0]?.status).toBe("realized");
    });
  });

  verifies(ConTraceables.CON_020_COVERAGE_UNIVERSE, () => {
    test("classifies exactly the traceables given, of any lens, inventing none", () => {
      const traceables = [
        traceable("SW-1", "SW"),
        traceable("STK-1", "STK"),
        traceable("SYS-1", "SYS"),
      ];

      const result = computeCoverage(traceables, [anchor("STK-1", "realizes")]);

      expect(result.map((spec) => spec.id)).toEqual(["STK-1", "SW-1", "SYS-1"]);
      expect(result.find((spec) => spec.id === "STK-1")?.status).toBe(
        "realized",
      );
    });
  });
});

describe("reconcileWaivers", () => {
  const coverage: SpecCoverage[] = [
    { id: "SW-1", lens: "SW", status: "covered" },
    { id: "SW-2", lens: "SW", status: "none" },
    { id: "SW-3", lens: "SW", status: "none" },
  ];

  verifies(
    [
      SwTraceables.SW_027_APPLY_WAIVERS,
      SysTraceables.SYS_012_COVERAGE_POLICY_AND_WAIVERS,
    ],
    () => {
      test("a not-Covered spec with a matching waiver is waived, not an open gap", () => {
        const result = reconcileWaivers(coverage, [
          { id: "SW-2", reason: "no code site" },
        ]);

        expect(result.specs.find((spec) => spec.id === "SW-2")?.waiver).toEqual(
          {
            reason: "no code site",
          },
        );
        expect(
          result.specs.find((spec) => spec.id === "SW-3")?.waiver,
        ).toBeUndefined();
        expect(result.staleWaivers).toEqual([]);
      });

      test("a waiver for a Covered spec or an unknown id is stale", () => {
        const result = reconcileWaivers(coverage, [
          { id: "SW-999", reason: "typo" },
          { id: "SW-1", reason: "already done" },
        ]);

        expect(result.staleWaivers).toEqual([
          { id: "SW-1", reason: "already done" },
          { id: "SW-999", reason: "typo" },
        ]);
        expect(
          result.specs.find((spec) => spec.id === "SW-1")?.waiver,
        ).toBeUndefined();
      });
    },
  );
});

describe("coverage result output", () => {
  const result: CoverageResult = {
    specs: [
      { id: "SW-1", lens: "SW", status: "covered" },
      {
        id: "SW-2",
        lens: "SW",
        status: "none",
        waiver: { reason: "no code site" },
      },
      { id: "SW-3", lens: "SW", status: "realized" },
    ],
    staleWaivers: [{ id: "SW-9", reason: "typo" }],
  };

  verifies(
    [
      SwTraceables.SW_028_EMIT_COVERAGE_RESULT,
      SysTraceables.SYS_013_SHARED_SCHEMAS,
    ],
    () => {
      test("writes coverage.json in the shared shape and replaces it wholesale", async () => {
        const root = await mkdtemp(join(tmpdir(), "ariadne-coverage-"));

        const file = await writeCoverageResult(result, { projectRoot: root });
        expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
          specs: [
            { id: "SW-1", lens: "SW", status: "covered" },
            { id: "SW-2", lens: "SW", status: "none", reason: "no code site" },
            { id: "SW-3", lens: "SW", status: "realized" },
          ],
          staleWaivers: [{ id: "SW-9", reason: "typo" }],
        });

        await writeCoverageResult(
          {
            specs: [{ id: "CON-1", lens: "CON", status: "verified" }],
            staleWaivers: [],
          },
          { projectRoot: root },
        );
        expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
          specs: [{ id: "CON-1", lens: "CON", status: "verified" }],
          staleWaivers: [],
        });
      });

      test("the report states the per-status count, the gaps, the waived, and stale waivers", () => {
        const report = formatCoverageReport(result);

        expect(report).toContain(
          "1 covered, 1 realized, 0 verified, 1 none (3 specs)",
        );
        expect(report).toContain("Open gaps (1):");
        expect(report).toContain("SW-3  realized");
        expect(report).toContain("Waived (1):");
        expect(report).toContain("SW-2  none — no code site");
        expect(report).toContain("Stale waivers (1):");
        expect(report).toContain("SW-9 — typo");
      });
    },
  );
});
