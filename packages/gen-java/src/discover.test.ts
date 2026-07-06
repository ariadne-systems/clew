import type { AnchorLocation } from "@ariadne-thread/core";
import { SwTraceables, SysTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { discoverAnchors } from "./discover.js";

/** Discovers anchors in a single in-memory Java source. */
function discover(contents: string): AnchorLocation[] {
  return discoverAnchors([{ path: "src/A.java", contents }]);
}

describe("java anchor discovery", () => {
  verifies(
    [
      SwTraceables.SW_038_DISCOVER_ANCHORS_JAVA,
      SysTraceables.SYS_011_NAMED_ANCHOR_RELATIONS,
    ],
    () => {
      test("discovers each annotation form for all three relations", () => {
        const source = [
          "@RealizesSw(SwTraceables.SW_001_A)",
          "class A {}",
          "@VerifiesSw(SwTraceables.SW_002_B)",
          "void t() {}",
          "@ConcernsSw(SwTraceables.SW_003_C)",
          "int x;",
        ].join("\n");

        expect(discover(source)).toEqual([
          { id: "SW-001", relation: "realizes", file: "src/A.java", line: 1 },
          { id: "SW-002", relation: "verifies", file: "src/A.java", line: 3 },
          { id: "SW-003", relation: "concerns", file: "src/A.java", line: 5 },
        ]);
      });

      test("reads a {…} list, recording each id at the annotation, across sets", () => {
        const anchors = discover(
          "@RealizesSw({SwTraceables.SW_010_A, ConTraceables.CON_011_B})\nclass X {}",
        );

        expect(anchors).toEqual([
          { id: "SW-010", relation: "realizes", file: "src/A.java", line: 1 },
          { id: "CON-011", relation: "realizes", file: "src/A.java", line: 1 },
        ]);
      });

      test("derives the id from the member name, bare or qualified", () => {
        const anchors = discover(
          [
            "@RealizesSw(SW_013_BARE)",
            "@RealizesSw(pkg.SwTraceables.SW_014_QUALIFIED)",
          ].join("\n"),
        );

        expect(anchors.map((anchor) => anchor.id)).toEqual([
          "SW-013",
          "SW-014",
        ]);
      });

      test("ignores annotation-shaped text in line and block comments", () => {
        const source = [
          "// @RealizesSw(SW_020_A)",
          "/* a block",
          "   @VerifiesSw(SW_021_B) */",
          "@RealizesSw(SwTraceables.SW_022_C)",
          "class C {}",
        ].join("\n");

        expect(discover(source)).toEqual([
          { id: "SW-022", relation: "realizes", file: "src/A.java", line: 4 },
        ]);
      });

      test("ignores annotation-shaped text in a string and a text block", () => {
        const source = [
          'String s = "@RealizesSw(SW_030_A)";',
          'String block = """',
          "  @RealizesSw(SW_031_B)",
          '  """;',
          "@RealizesSw(SwTraceables.SW_032_C)",
          "class C {}",
        ].join("\n");

        expect(discover(source)).toEqual([
          { id: "SW-032", relation: "realizes", file: "src/A.java", line: 5 },
        ]);
      });

      test("round-trips: discovery recovers exactly the ids the annotations name (ADR-0005 D2)", () => {
        const source = [
          "@RealizesSw(SwTraceables.SW_050_A)",
          "@VerifiesCon(ConTraceables.CON_051_B)",
          "@ConcernsArch(ArchTraceables.ARCH_052_C)",
          "class Z {}",
        ].join("\n");

        const recovered = discover(source).map((anchor) => ({
          id: anchor.id,
          relation: anchor.relation,
        }));

        expect(recovered).toEqual([
          { id: "SW-050", relation: "realizes" },
          { id: "CON-051", relation: "verifies" },
          { id: "ARCH-052", relation: "concerns" },
        ]);
      });
    },
  );
});
