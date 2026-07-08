import {
  ArchTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { GeneratedFile, SpecSet } from "../../spec/generator.js";
import { createJavaGenerator } from "./index.js";

const specSets: SpecSet[] = [
  {
    name: "SW",
    specs: [
      {
        id: "SW-002",
        lens: "SW",
        filename: "SW-002-mint-ids.md",
        status: "active",
      },
      {
        id: "SW-005",
        lens: "SW",
        filename: "SW-005-old.md",
        status: "deprecated",
      },
    ],
  },
];

const OUTPUT = { outputDir: "src/main/java/ariadne/traceables" };

function fileNamed(
  files: readonly GeneratedFile[],
  path: string,
): GeneratedFile | undefined {
  return files.find((file) => file.path === path);
}

describe("java generator output", () => {
  verifies(
    [
      SwTraceables.SW_037_JAVA_ANNOTATION_ANCHORED_OUTPUT,
      ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
      SysTraceables.SYS_008_LANGUAGE_NEUTRAL_EXTENSIBILITY,
    ],
    () => {
      test("emits one enum per set, package from the output dir, constants from filenames, read via id()", async () => {
        const files = await createJavaGenerator().generate(specSets, OUTPUT);
        const enumFile = fileNamed(files, "SwTraceables.java");

        expect(enumFile?.contents).toContain("package ariadne.traceables;");
        expect(enumFile?.contents).toContain("public enum SwTraceables {");
        expect(enumFile?.contents).toContain('SW_002_MINT_IDS("SW-002")');
        expect(enumFile?.contents).toContain("public String id() {");
        expect(enumFile?.contents).toContain("@clew generator-type: java");
        expect(enumFile?.contents).toContain("@clew spec-set: SW");
      });

      test("marks a deprecated spec's constant @Deprecated and keeps it", async () => {
        const files = await createJavaGenerator().generate(specSets, OUTPUT);
        expect(fileNamed(files, "SwTraceables.java")?.contents).toContain(
          '@Deprecated\n  SW_005_OLD("SW-005")',
        );
      });

      test("emits one annotation per relation per set into an annotation subpackage, importing its enum", async () => {
        const files = await createJavaGenerator().generate(specSets, OUTPUT);
        for (const name of ["RealizesSw", "VerifiesSw", "ConcernsSw"]) {
          const annotation = fileNamed(files, `annotation/${name}.java`);
          expect(annotation?.contents).toContain(`public @interface ${name} {`);
          expect(annotation?.contents).toContain(
            "package ariadne.traceables.annotation;",
          );
          expect(annotation?.contents).toContain(
            "import ariadne.traceables.SwTraceables;",
          );
          expect(annotation?.contents).toContain("SwTraceables[] value();");
          expect(annotation?.contents).toContain("@Retention(SOURCE)");
          expect(annotation?.contents).toContain(
            "@Target({PACKAGE, TYPE, METHOD, FIELD})",
          );
          expect(annotation?.contents).toContain(
            `@Repeatable(${name}.Container.class)`,
          );
        }
      });

      test("emits a README documenting the annotations", async () => {
        const files = await createJavaGenerator().generate(specSets, OUTPUT);
        expect(fileNamed(files, "README.md")?.contents).toContain(
          "Generated anchoring annotations for Java",
        );
      });

      test("declares its default output directory", () => {
        expect(createJavaGenerator().defaultOutputDir).toBe(
          "src/main/java/ariadne/traceables",
        );
      });

      test("reads its emitted traceables back, round-tripping ids and deprecation", async () => {
        const generator = createJavaGenerator();
        const files = await generator.generate(specSets, OUTPUT);

        expect(generator.readTraceables(files)).toEqual([
          { id: "SW-002", deprecated: false },
          { id: "SW-005", deprecated: true },
        ]);
      });

      test("re-running on unchanged specs is byte-identical", async () => {
        const first = await createJavaGenerator().generate(specSets, OUTPUT);
        const second = await createJavaGenerator().generate(specSets, OUTPUT);

        expect(second).toEqual(first);
      });
    },
  );
});
