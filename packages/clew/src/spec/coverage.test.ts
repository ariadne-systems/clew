import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type {
  AnchorLocation,
  CoverageResult,
  GeneratedTraceable,
  Generator,
  SpecCoverage,
} from "../index.js";
import {
  computeCoverage,
  formatCoverageReport,
  GENERATED_MARKER,
  readUniverse,
  reconcileWaivers,
  writeCoverageResult,
} from "../index.js";

// A non-deprecated generated traceable; the coverage universe carries only the
// id and deprecation — the lens is derived from the id prefix.
function traceable(id: string, _lens?: string): GeneratedTraceable {
  return { id, deprecated: false };
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

    test("reports a deprecated traceable as deprecated, not classified by its anchors", () => {
      const universe: GeneratedTraceable[] = [
        { id: "SW-1", deprecated: false },
        { id: "SW-2", deprecated: true },
      ];

      const result = computeCoverage(universe, [
        anchor("SW-1", "realizes"),
        anchor("SW-2", "realizes"),
        anchor("SW-2", "verifies"),
      ]);

      // The deprecated marker wins over the spec's anchors; the lens is the id prefix.
      expect(result).toEqual([
        { id: "SW-1", lens: "SW", status: "realized" },
        { id: "SW-2", lens: "SW", status: "deprecated" },
      ]);
    });
  });
});

describe("reconcileWaivers", () => {
  const coverage: SpecCoverage[] = [
    { id: "STK-001", lens: "STK", status: "realized" },
    { id: "STK-002", lens: "STK", status: "realized" },
    { id: "STK-005", lens: "STK", status: "none" },
    { id: "SW-1", lens: "SW", status: "covered" },
  ];

  verifies(
    [
      SwTraceables.SW_027_APPLY_WAIVERS,
      SysTraceables.SYS_012_COVERAGE_POLICY_AND_WAIVERS,
    ],
    () => {
      test("a Realized spec a waiver names is waived, not an open gap", () => {
        const result = reconcileWaivers(coverage, [
          { id: "STK-001", reason: "verified by acceptance" },
        ]);

        expect(
          result.specs.find((spec) => spec.id === "STK-001")?.waiver,
        ).toEqual({ reason: "verified by acceptance" });
        expect(
          result.specs.find((spec) => spec.id === "STK-002")?.waiver,
        ).toBeUndefined();
        expect(result.staleWaivers).toEqual([]);
      });

      test("a waiver for a Covered spec or an unknown id waives nothing and is stale", () => {
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

      test("a waiver matching no spec it can waive is stale", () => {
        const result = reconcileWaivers(coverage, [
          { pattern: "ARCH-*", reason: "nothing here" },
        ]);

        expect(result.staleWaivers).toEqual([
          { pattern: "ARCH-*", reason: "nothing here" },
        ]);
      });
    },
  );

  verifies(SwTraceables.SW_030_WAIVER_MATCH_BY_ID_OR_PATTERN, () => {
    test("a glob pattern waives every Realized spec it matches", () => {
      const result = reconcileWaivers(coverage, [
        { pattern: "STK-*", reason: "verified by acceptance" },
      ]);

      expect(
        result.specs.find((spec) => spec.id === "STK-001")?.waiver,
      ).toEqual({ reason: "verified by acceptance" });
      expect(
        result.specs.find((spec) => spec.id === "STK-002")?.waiver,
      ).toEqual({ reason: "verified by acceptance" });
      expect(result.staleWaivers).toEqual([]);
    });
  });

  verifies(ConTraceables.CON_021_MISSING_REALIZE_NEVER_WAIVABLE, () => {
    test("a None spec is never waived — by id or by pattern — and stays an open gap", () => {
      const byId = reconcileWaivers(coverage, [{ id: "STK-005", reason: "x" }]);
      expect(
        byId.specs.find((spec) => spec.id === "STK-005")?.waiver,
      ).toBeUndefined();
      expect(byId.staleWaivers).toEqual([{ id: "STK-005", reason: "x" }]);

      const byPattern = reconcileWaivers(coverage, [
        { pattern: "STK-*", reason: "y" },
      ]);
      expect(
        byPattern.specs.find((spec) => spec.id === "STK-005")?.waiver,
      ).toBeUndefined();
    });
  });
});

describe("coverage result output", () => {
  const result: CoverageResult = {
    specs: [
      { id: "SW-1", lens: "SW", status: "covered" },
      {
        id: "SW-2",
        lens: "SW",
        status: "realized",
        waiver: { reason: "verified by acceptance" },
      },
      { id: "SW-3", lens: "SW", status: "realized" },
      { id: "SW-4", lens: "SW", status: "none" },
    ],
    staleWaivers: [{ pattern: "ARCH-*", reason: "nothing here" }],
  };

  verifies(
    [
      SwTraceables.SW_028_EMIT_COVERAGE_RESULT,
      SysTraceables.SYS_013_SHARED_SCHEMAS,
    ],
    () => {
      test("writes coverage.json in the shared shape and replaces it wholesale", async () => {
        const root = await mkdtemp(join(tmpdir(), "clew-coverage-"));

        const file = await writeCoverageResult(result, { projectRoot: root });
        expect(JSON.parse(await readFile(file, "utf8"))).toEqual({
          specs: [
            { id: "SW-1", lens: "SW", status: "covered" },
            {
              id: "SW-2",
              lens: "SW",
              status: "realized",
              reason: "verified by acceptance",
            },
            { id: "SW-3", lens: "SW", status: "realized" },
            { id: "SW-4", lens: "SW", status: "none" },
          ],
          staleWaivers: [{ pattern: "ARCH-*", reason: "nothing here" }],
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
          "1 covered, 2 realized, 0 verified, 1 none (4 specs)",
        );
        expect(report).toContain("Open gaps (2):");
        expect(report).toContain("SW-3  realized");
        expect(report).toContain("SW-4  none");
        expect(report).toContain("Waived (1):");
        expect(report).toContain("SW-2  realized — verified by acceptance");
        expect(report).toContain("Stale waivers (1):");
        expect(report).toContain("ARCH-* — nothing here");
      });

      test("lists a deprecated spec separately and does not count it in the totals", () => {
        const report = formatCoverageReport({
          specs: [
            { id: "SW-1", lens: "SW", status: "covered" },
            { id: "SW-9", lens: "SW", status: "deprecated" },
          ],
          staleWaivers: [],
        });

        // The deprecated spec is not in the count (1 spec, not 2) and not a gap.
        expect(report).toContain(
          "1 covered, 0 realized, 0 verified, 0 none (1 specs)",
        );
        expect(report).toContain("Deprecated (1):");
        expect(report).toContain("  SW-9");
        expect(report).not.toContain("Open gaps");
      });
    },
  );
});

describe("readUniverse", () => {
  verifies(
    [
      ArchTraceables.ARCH_004_GENERATOR_DISCOVERS_MARKERS,
      ConTraceables.CON_020_COVERAGE_UNIVERSE,
    ],
    () => {
      test("reads only generated files back — a stray, unmarked file in the output dir is ignored", async () => {
        const dir = await mkdtemp(join(tmpdir(), "clew-universe-"));
        const outputDir = join(dir, "out");
        // Generated files live in clew's reserved subdirectory of the output dir.
        const clewDir = join(outputDir, "clew");
        await mkdir(clewDir, { recursive: true });
        // A generated enum file carries the marker; a hand-written file does not.
        await writeFile(
          join(clewDir, "SwTraceables.ts"),
          `// ${GENERATED_MARKER}\nSW_001_A = "SW-001",\n`,
          "utf8",
        );
        await writeFile(
          join(clewDir, "stray.ts"),
          'const STALE = "SW-999";\n',
          "utf8",
        );
        await writeFile(
          join(dir, ".clewrc.json"),
          JSON.stringify({ generators: [{ type: "fake", outputDir: "out" }] }),
          "utf8",
        );
        // A fake generator that reads back any `NAME = "ID"` it is handed, so the
        // assertion turns on which files reached it (the marker filter), not on a
        // language grammar.
        const fake: Generator = {
          name: "fake",
          defaultOutputDir: "out",
          sourceExtensions: [".ts"],
          findComments: () => [],
          discover: () => [],
          generate: async () => [],
          readTraceables: (files) =>
            files.flatMap((file) =>
              [...file.contents.matchAll(/[A-Za-z_]\w* = "([^"]+)"/g)].map(
                (match) => ({ id: match[1] as string, deprecated: false }),
              ),
            ),
        };

        const universe = await readUniverse({
          resolveGenerator: () => fake,
          configFile: join(dir, ".clewrc.json"),
          projectRoot: dir,
        });

        // The stray file's member never reaches the generator — only the marked
        // file's member is in the universe.
        expect(universe).toEqual([{ id: "SW-001", deprecated: false }]);
      });
    },
  );
});
