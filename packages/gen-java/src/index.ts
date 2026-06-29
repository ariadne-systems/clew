import type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
} from "@ariadne-thread/core";
import {
  classifyCFamily,
  generatedHeader,
  parseGeneratedTraceables,
  toIdentifier,
  toMemberName,
  toPascalCase,
} from "@ariadne-thread/core";
import { ArchTraceables, ConTraceables, realizes } from "@ariadne-thread/trace";

/** This generator's type — its name and the `generator-type` in the provenance header. */
const GENERATOR_TYPE = "java";

/** The Java traceables file name within the project's configured output directory. */
const OUTPUT_PATH = "Traceables.java";

/**
 * The Java generator (STR-011 skeleton). It emits one `Traceables`
 * class holding, per spec set, a nested enum whose constants are that set's
 * traceables — the constant name derived from the spec's filename (matching the
 * TypeScript generator), the value the id. The package is derived from the
 * configured output directory so the file compiles where it lands. This is a
 * first working emission, not a complete generator.
 */
export const createJavaGenerator: () => Generator = realizes(
  [
    ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
    ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS,
    ConTraceables.CON_030_GENERATED_OUTPUT_INERT_TO_SCAN,
  ],
  (): Generator => {
    return {
      name: GENERATOR_TYPE,
      defaultOutputDir: "src/main/java/ariadne/traceables",
      sourceExtensions: [".java"],
      generate(
        specSets: readonly SpecSet[],
        context: GenerateContext,
      ): Promise<readonly GeneratedFile[]> {
        return Promise.resolve([renderTraceablesFile(specSets, context)]);
      },
      // Skeleton, like `generate` (STR-011): Java discovery follows the same
      // contract (ARCH-004) but is not implemented in the TypeScript scan story.
      discover: () => [],
      readTraceables: (files) =>
        parseGeneratedTraceables(files, CONSTANT_PATTERN),
      // Java has neither template literals nor regex literals, but has text blocks
      // (`"""…"""`); enabling them keeps a comment-like token inside a text block from
      // being read as a comment, and scans only `//` and `/* */` elsewhere.
      findComments: (content) =>
        classifyCFamily(content, {
          templates: false,
          regex: false,
          textBlocks: true,
        }).comments,
    };
  },
);

/**
 * A generated enum constant, optionally preceded by `@Deprecated`: `NAME("ID")`.
 * `parseGeneratedTraceables` reads it back — capture group 1 is the deprecation
 * marker, group 2 the spec id. Java does not yet emit `@Deprecated` constants (a
 * follow-on), so today none match group 1; the parser handles it for when it does.
 */
const CONSTANT_PATTERN = /(@Deprecated\s+)?[A-Za-z_]\w*\("([^"]+)"\)/g;

function renderTraceablesFile(
  specSets: readonly SpecSet[],
  context: GenerateContext,
): GeneratedFile {
  const javaPackage = toJavaPackage(context.outputDir);
  const lines: string[] = [...generatedHeader(GENERATOR_TYPE), ""];
  if (javaPackage.length > 0) {
    lines.push(`package ${javaPackage};`, "");
  }
  lines.push("public final class Traceables {", "  private Traceables() {}");

  for (const specSet of specSets) {
    const enumName = toIdentifier(toPascalCase(specSet.name));
    const constants = specSet.specs.map(
      (traceable) =>
        `    ${toMemberName(traceable.filename)}(${JSON.stringify(traceable.id)})`,
    );
    lines.push("");
    lines.push(`  public enum ${enumName} {`);
    lines.push(`${constants.join(",\n")};`);
    lines.push("");
    lines.push("    private final String id;");
    lines.push("");
    lines.push(`    ${enumName}(String id) {`);
    lines.push("      this.id = id;");
    lines.push("    }");
    lines.push("");
    lines.push("    public String id() {");
    lines.push("      return this.id;");
    lines.push("    }");
    lines.push("  }");
  }

  lines.push("}", "");
  return { path: OUTPUT_PATH, contents: lines.join("\n") };
}

/**
 * Derives a Java package from the output directory, stripping a conventional Java
 * source root (`src/main/java/` or a leading `src/`) so the package matches the
 * file's location on disk. An empty result yields no package statement.
 */
function toJavaPackage(outputDir: string): string {
  const normalized = outputDir.replaceAll("\\", "/").replace(/^\.?\//, "");
  const withoutRoot = normalized.replace(/^src\/(main\/java\/)?/, "");
  return withoutRoot
    .split("/")
    .filter((segment) => segment.length > 0)
    .map(toIdentifier)
    .join(".");
}
