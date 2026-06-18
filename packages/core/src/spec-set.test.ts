import { describe, expect, test } from "vitest";
import type { Traceable } from "./index.js";
import { groupIntoSpecSets, lensMatchers } from "./index.js";

const traceables: Traceable[] = [
  { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
  { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
  { id: "CON-012", lens: "CON", filename: "CON-012-owned.md" },
];

describe("lens matchers", () => {
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

describe("grouping traceables into spec sets", () => {
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

  test("matches on the descriptive slug, not only the lens prefix", () => {
    const matchers = [{ name: "commands", pattern: "command" }];

    const specSets = groupIntoSpecSets(traceables, matchers);

    expect(specSets).toEqual([
      {
        name: "commands",
        traceables: [
          { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
        ],
      },
    ]);
  });

  test("drops a matcher that selects nothing", () => {
    const matchers = [
      { name: "SW", pattern: "^SW-" },
      { name: "NF", pattern: "^NF-" },
    ];

    const specSets = groupIntoSpecSets(traceables, matchers);

    expect(specSets.map((specSet) => specSet.name)).toEqual(["SW"]);
  });

  test("assigns a traceable to the first matching matcher", () => {
    const matchers = [
      { name: "all-sw", pattern: "^SW-" },
      { name: "also-sw", pattern: "^SW-0" },
    ];

    const specSets = groupIntoSpecSets(traceables, matchers);

    expect(specSets).toEqual([
      {
        name: "all-sw",
        traceables: [
          { id: "SW-012", lens: "SW", filename: "SW-012-command.md" },
          { id: "SW-013", lens: "SW", filename: "SW-013-scan.md" },
        ],
      },
    ]);
  });
});
