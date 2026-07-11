import { SwTraceables, SysTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { AnchorLocation } from "../../spec/generator.js";
import { discoverAnchors } from "./discover.js";

/** Discovers anchors in a single in-memory TypeScript source. */
function discover(contents: string): AnchorLocation[] {
  return discoverAnchors([{ path: "src/a.ts", contents }]);
}

describe("typescript anchor discovery", () => {
  verifies(
    [
      SwTraceables.SW_021_DISCOVER_ANCHORS_TYPESCRIPT,
      SysTraceables.SYS_011_NAMED_ANCHOR_RELATIONS,
    ],
    () => {
      test("discovers every marker form for all three relations", () => {
        const source = [
          "const a = realizes(SwTraceables.SW_001_A, 1);",
          "@realizes(SwTraceables.SW_002_B)",
          "class B {}",
          "verifies(SwTraceables.SW_003_C, () => {});",
          "const d = concerns(SwTraceables.SW_004_D, 2);",
          "@concerns(SwTraceables.SW_005_E)",
          "class E {}",
          "type F = Realizes<SwTraceables.SW_006_F, number>;",
          "interface G extends Concerns<SwTraceables.SW_007_G, unknown> {}",
        ].join("\n");

        expect(discover(source)).toEqual([
          { id: "SW-001", relation: "realizes", file: "src/a.ts", line: 1 },
          { id: "SW-002", relation: "realizes", file: "src/a.ts", line: 2 },
          { id: "SW-003", relation: "verifies", file: "src/a.ts", line: 4 },
          { id: "SW-004", relation: "concerns", file: "src/a.ts", line: 5 },
          { id: "SW-005", relation: "concerns", file: "src/a.ts", line: 6 },
          { id: "SW-006", relation: "realizes", file: "src/a.ts", line: 8 },
          { id: "SW-007", relation: "concerns", file: "src/a.ts", line: 9 },
        ]);
      });

      test("reads a non-empty id list, recording each id at the marker", () => {
        const anchors = discover(
          "const x = realizes([SwTraceables.SW_010_A, ConTraceables.CON_011_B], 1);",
        );
        expect(anchors).toEqual([
          { id: "SW-010", relation: "realizes", file: "src/a.ts", line: 1 },
          { id: "CON-011", relation: "realizes", file: "src/a.ts", line: 1 },
        ]);
      });

      test("reads only the leading id argument, ignoring a value with nested parens and id-shaped tokens", () => {
        const anchors = discover(
          "const x = realizes(SwTraceables.SW_012_A, makeThing(deep(1), other_42));",
        );
        expect(anchors).toEqual([
          { id: "SW-012", relation: "realizes", file: "src/a.ts", line: 1 },
        ]);
      });

      test("derives the id from the member name, bare or qualified", () => {
        const anchors = discover(
          [
            "const a = realizes(SW_013_BARE, 1);",
            "const b = realizes(Some.Deep.SW_014_QUALIFIED, 2);",
          ].join("\n"),
        );
        expect(anchors.map((anchor) => anchor.id)).toEqual([
          "SW-013",
          "SW-014",
        ]);
      });

      test("ignores marker-shaped text in line and block comments", () => {
        const source = [
          "// realizes(SW_020_A, 1)",
          "/* a block",
          "   @verifies(SW_021_B) */",
          "const real = realizes(SwTraceables.SW_022_C, 1);",
        ].join("\n");
        expect(discover(source)).toEqual([
          { id: "SW-022", relation: "realizes", file: "src/a.ts", line: 4 },
        ]);
      });

      test("ignores marker-shaped text in quoted strings", () => {
        expect(discover('const s = "realizes(SW_030_A, 1)";')).toEqual([]);
      });

      test("ignores marker-shaped text in a template literal, but scans its interpolations", () => {
        const source = [
          "const t = `text realizes(SW_031_A, 1) more`;",
          // biome-ignore lint/suspicious/noTemplateCurlyInString: a fixture representing a template interpolation in scanned source, not a string meant to interpolate.
          "const u = `${realizes(SwTraceables.SW_032_B, 1)}`;",
        ].join("\n");
        expect(discover(source)).toEqual([
          { id: "SW-032", relation: "realizes", file: "src/a.ts", line: 2 },
        ]);
      });

      test("ignores marker-shaped text in a regex literal", () => {
        const source = [
          "const re = /realizes\\(SW_040_A\\)/g;",
          "const real = verifies(SwTraceables.SW_041_B, () => {});",
        ].join("\n");
        expect(discover(source)).toEqual([
          { id: "SW-041", relation: "verifies", file: "src/a.ts", line: 2 },
        ]);
      });

      test("round-trips: discovery recovers exactly the ids the markers name", () => {
        const source = [
          "const a = realizes(SwTraceables.SW_050_A, 1);",
          "verifies(ConTraceables.CON_051_B, () => {});",
          "type C = Concerns<ArchTraceables.ARCH_052_C, number>;",
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
