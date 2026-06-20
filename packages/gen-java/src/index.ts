import type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
} from "@ariadne-thread/core";
import {
  generatedHeader,
  toIdentifier,
  toMemberName,
  toPascalCase,
} from "@ariadne-thread/core";
import { ArchTraceables, traces } from "@ariadne-thread/trace";

/** This generator's type — its name and the `generator-type` in the provenance header. */
const GENERATOR_TYPE = "java";

/** The Java traceables file name within the project's configured output directory. */
const OUTPUT_PATH = "Traceables.java";

/**
 * The Java generator (ARCH-003; STR-011 skeleton). It emits one `Traceables`
 * class holding, per spec set, a nested enum whose constants are that set's
 * traceables — the constant name derived from the spec's filename (matching the
 * TypeScript generator), the value the id. The package is derived from the
 * configured output directory so the file compiles where it lands. This is a
 * first working emission, not a complete generator.
 */
export const createJavaGenerator: () => Generator = traces(
  ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
  (): Generator => {
    return {
      name: GENERATOR_TYPE,
      defaultOutputDir: "src/main/java/ariadne/traceables",
      generate(
        specSets: readonly SpecSet[],
        context: GenerateContext,
      ): Promise<readonly GeneratedFile[]> {
        return Promise.resolve([renderTraceablesFile(specSets, context)]);
      },
    };
  },
);

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
    const constants = specSet.traceables.map(
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
