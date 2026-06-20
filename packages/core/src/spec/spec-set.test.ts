import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { AriadneError, SpecSetMatcher, Traceable } from "../index.js";
import { ErrorCode, groupIntoSpecSets, lensMatchers } from "../index.js";

const traceables: Traceable[] = [
  { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
  { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
  { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
];

// Returns the stable error code a synchronous call throws, failing the test if
// it does not throw.
function thrownCode(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    return (error as AriadneError).code;
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

        const specSets = groupIntoSpecSets(traceables, lensMatchers(lenses));

        expect(specSets).toEqual([
          {
            name: "CON",
            traceables: [
              { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
            ],
          },
          {
            name: "SW",
            traceables: [
              { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
              { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
            ],
          },
        ]);
      });

      test("groups by configured patterns matching the descriptive slug", () => {
        const matchers: SpecSetMatcher[] = [
          { name: "commands", pattern: "command" },
          { name: "rest", catchAll: true },
        ];

        const specSets = groupIntoSpecSets(traceables, matchers);

        expect(specSets).toEqual([
          {
            name: "commands",
            traceables: [
              { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
            ],
          },
          {
            name: "rest",
            traceables: [
              { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
              { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
            ],
          },
        ]);
      });

      test("a traceable matching more than one set is an overlap error", () => {
        const matchers: SpecSetMatcher[] = [
          { name: "by-prefix", pattern: "^SW-" },
          { name: "by-slug", pattern: "command" },
        ];
        const overlapping = [
          { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
        ];

        expect(thrownCode(() => groupIntoSpecSets(overlapping, matchers))).toBe(
          ErrorCode.SPEC_SET_OVERLAP,
        );
      });

      test("a traceable matching no set is an unmatched error", () => {
        const matchers: SpecSetMatcher[] = [{ name: "sw", pattern: "^SW-" }];
        const unmatched = [
          { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
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

        const specSets = groupIntoSpecSets(traceables, matchers);

        expect(
          specSets.find((specSet) => specSet.name === "everything-else")
            ?.traceables,
        ).toEqual([
          { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
        ]);
      });

      test("an ignore pattern excludes matching traceables from every set", () => {
        const lenses = [
          { id: "SW", description: "software" },
          { id: "CON", description: "constraint" },
        ];

        const specSets = groupIntoSpecSets(traceables, lensMatchers(lenses), [
          "owned",
        ]);

        expect(specSets.map((specSet) => specSet.name)).toEqual(["SW"]);
      });
    },
  );
});
