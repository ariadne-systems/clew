import type { SourceFile, SpecSet } from "@ariadne-thread/core";
import { ConTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { createJavaGenerator } from "./index.js";

const SPEC_SETS: SpecSet[] = [
  {
    name: "SW",
    specs: [
      {
        id: "SW-001",
        lens: "SW",
        filename: "SW-001-allocate-ids.md",
        status: "active",
      },
    ],
  },
  {
    name: "ARCH",
    specs: [
      {
        id: "ARCH-001",
        lens: "ARCH",
        filename: "ARCH-001-pluggable-strategy.md",
        status: "active",
      },
    ],
  },
];

describe("generated Java output", () => {
  verifies(ConTraceables.CON_030_GENERATED_OUTPUT_INERT_TO_SCAN, () => {
    test("is inert: discovery and comment detection find nothing in it", async () => {
      const generator = createJavaGenerator();
      const files = await generator.generate(SPEC_SETS, {
        outputDir: "src/main/java/ariadne/traceables",
      });
      const sources: SourceFile[] = files
        .filter((file) => file.path.endsWith(".java"))
        .map((file) => ({ path: file.path, contents: file.contents }));
      const emittedIds = SPEC_SETS.flatMap((specSet) =>
        specSet.specs.map((spec) => spec.id),
      );

      expect(generator.discover(sources)).toEqual([]);

      for (const source of sources) {
        for (const span of generator.findComments(source.contents)) {
          for (const id of emittedIds) {
            expect(span.text).not.toContain(id);
          }
        }
      }
    });
  });
});
