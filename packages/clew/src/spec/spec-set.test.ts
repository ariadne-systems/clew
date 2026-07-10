import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { ClewError, ScannedSpec, SpecSetMatcher } from "../index.js";
import { ErrorCode, groupIntoSpecSets, lensMatchers } from "../index.js";

const specs: ScannedSpec[] = [
  { id: "SW-013", lens: "SW", filename: "SW-013-scan.md", status: "active" },
  { id: "SW-012", lens: "SW", filename: "SW-012-command.md", status: "active" },
  {
    id: "CON-012",
    lens: "CON",
    filename: "CON-012-owned.md",
    status: "active",
  },
];

// Returns the stable error code a synchronous call throws, failing the test if
// it does not throw.
function thrownCode(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as ClewError).code;
  }
  throw new Error("expected the call to throw");
}

describe("lens matchers", () => {
  verifies(SwTraceables.SW_015_GROUP_TRACEABLES, () => {
    test("derive one filename-prefix matcher per configured lens", () => {
      const matchers = lensMatchers([
        { id: "SW", description: "software" },
        { id: "CON", description: "constraint" },
      ]);

      expect(matchers).toEqual([
        { name: "SW", pattern: "^SW-.*\\.md$" },
        { name: "CON", pattern: "^CON-.*\\.md$" },
      ]);
    });
  });
});

describe("grouping traceables into spec sets", () => {
  verifies(
    [
      SwTraceables.SW_015_GROUP_TRACEABLES,
      ConTraceables.CON_013_SPEC_SET_PARTITION,
    ],
    () => {
      test("groups by the default lens matchers, sorted by set name then id", () => {
        const lenses = [
          { id: "SW", description: "software" },
          { id: "CON", description: "constraint" },
        ];

        const specSets = groupIntoSpecSets(specs, lensMatchers(lenses));

        expect(specSets).toEqual([
          {
            name: "CON",
            specs: [
              {
                id: "CON-012",
                lens: "CON",
                filename: "CON-012-owned.md",
                status: "active",
              },
            ],
          },
          {
            name: "SW",
            specs: [
              {
                id: "SW-012",
                lens: "SW",
                filename: "SW-012-command.md",
                status: "active",
              },
              {
                id: "SW-013",
                lens: "SW",
                filename: "SW-013-scan.md",
                status: "active",
              },
            ],
          },
        ]);
      });

      test("groups by configured patterns matching the descriptive slug", () => {
        const matchers: SpecSetMatcher[] = [
          { name: "commands", pattern: "command" },
          { name: "rest", catchAll: true },
        ];

        const specSets = groupIntoSpecSets(specs, matchers);

        expect(specSets).toEqual([
          {
            name: "commands",
            specs: [
              {
                id: "SW-012",
                lens: "SW",
                filename: "SW-012-command.md",
                status: "active",
              },
            ],
          },
          {
            name: "rest",
            specs: [
              {
                id: "CON-012",
                lens: "CON",
                filename: "CON-012-owned.md",
                status: "active",
              },
              {
                id: "SW-013",
                lens: "SW",
                filename: "SW-013-scan.md",
                status: "active",
              },
            ],
          },
        ]);
      });

      test("a traceable matching more than one set is an overlap error", () => {
        const matchers: SpecSetMatcher[] = [
          { name: "by-prefix", pattern: "^SW-" },
          { name: "by-slug", pattern: "command" },
        ];
        const overlapping: ScannedSpec[] = [
          {
            id: "SW-012",
            lens: "SW",
            filename: "SW-012-command.md",
            status: "active",
          },
        ];

        expect(thrownCode(() => groupIntoSpecSets(overlapping, matchers))).toBe(
          ErrorCode.SPEC_SET_OVERLAP,
        );
      });

      test("a traceable matching no set is an unmatched error", () => {
        const matchers: SpecSetMatcher[] = [{ name: "sw", pattern: "^SW-" }];
        const unmatched: ScannedSpec[] = [
          {
            id: "CON-012",
            lens: "CON",
            filename: "CON-012-owned.md",
            status: "active",
          },
        ];

        expect(thrownCode(() => groupIntoSpecSets(unmatched, matchers))).toBe(
          ErrorCode.SPEC_SET_UNMATCHED,
        );
      });

      test("an unmatched traceable joins the catch-all set when one is configured", () => {
        const matchers: SpecSetMatcher[] = [
          { name: "sw", pattern: "^SW-" },
          { name: "everything-else", catchAll: true },
        ];

        const specSets = groupIntoSpecSets(specs, matchers);

        expect(
          specSets.find((specSet) => specSet.name === "everything-else")?.specs,
        ).toEqual([
          {
            id: "CON-012",
            lens: "CON",
            filename: "CON-012-owned.md",
            status: "active",
          },
        ]);
      });

      test("an ignore pattern excludes matching traceables from every set", () => {
        const lenses = [
          { id: "SW", description: "software" },
          { id: "CON", description: "constraint" },
        ];

        const specSets = groupIntoSpecSets(specs, lensMatchers(lenses), [
          "owned",
        ]);

        expect(specSets.map((specSet) => specSet.name)).toEqual(["SW"]);
      });
    },
  );
});
