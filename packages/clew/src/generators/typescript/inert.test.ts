import { ConTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { SourceFile, SpecSet } from "../../spec/generator.js";
import { createTypeScriptGenerator } from "./index.js";

// A representative corpus, including a deprecated member (which the generator emits
// with a JSDoc `@deprecated` comment), so the output exercises comments, string
// values, and the JSDoc `@example` markers in the helper module.
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
      {
        id: "SW-002",
        lens: "SW",
        filename: "SW-002-mint-ids.md",
        status: "deprecated",
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

describe("generated TypeScript output", () => {
  verifies(ConTraceables.CON_030_GENERATED_OUTPUT_INERT_TO_SCAN, () => {
    test("is inert: discovery and comment detection find nothing in it", async () => {
      const generator = createTypeScriptGenerator();
      const files = await generator.generate(SPEC_SETS, { outputDir: "out" });
      const sources: SourceFile[] = files
        .filter((file) => file.path.endsWith(".ts"))
        .map((file) => ({ path: file.path, contents: file.contents }));
      const emittedIds = SPEC_SETS.flatMap((specSet) =>
        specSet.specs.map((spec) => spec.id),
      );

      // The marker definitions and JSDoc `@example` markers in the helper module
      // are not discovered as anchors.
      expect(generator.discover(sources)).toEqual([]);

      // Emitted ids live only in member names (underscore form) and string values,
      // never in a comment.
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
