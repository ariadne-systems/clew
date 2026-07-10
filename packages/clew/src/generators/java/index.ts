import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
} from "../../spec/generator.js";
import {
  GENERATED_MARKER,
  generatedHeader,
  parseGeneratedTraceables,
} from "../../spec/generator.js";
import {
  setSymbolName,
  toIdentifier,
  toMemberName,
  toPascalCase,
} from "../../spec/identifiers.js";
import { classifyCFamily } from "../../text/c-family-lexer.js";
import { discoverAnchors, SOURCE_EXTENSIONS } from "./discover.js";

/** This generator's type — its name and the `generator-type` in the provenance header. */
const GENERATOR_TYPE = "java";

/** The three relations, PascalCase, that name the per-set annotations (ADR-0004). */
const RELATIONS = ["Realizes", "Verifies", "Concerns"] as const;

/** Where the anchoring annotations apply — the elements where code lives. */
const ANNOTATION_TARGETS = "{PACKAGE, TYPE, METHOD, FIELD}";

/**
 * The Java generator. For each spec set it emits one enum whose constants
 * are that set's traceables — the constant name derived from the spec's filename (so
 * it carries the id and slug), its value the spec id read back through `id()`, a
 * `deprecated` spec's constant marked `@Deprecated` — and, per set, one annotation
 * per relation (`@RealizesSw`, `@VerifiesSw`, `@ConcernsSw`, …) bound to that set's
 * enum. Because a Java annotation element must be an enum type, `javac` makes a
 * reference to a removed member a compile error; anchoring uses real
 * annotations on a package/type/method/field, not wrapper functions. The package is
 * derived from the configured output directory so the files compile where they land,
 * and a `README.md` documents the annotations. The output is deterministic and
 * tool-owned.
 */
export const createJavaGenerator: () => Generator = realizes(
  [
    SwTraceables.SW_037_JAVA_ANNOTATION_ANCHORED_OUTPUT,
    ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
    ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS,
    ConTraceables.CON_030_GENERATED_OUTPUT_INERT_TO_SCAN,
  ],
  (): Generator => {
    return {
      name: GENERATOR_TYPE,
      defaultOutputDir: "src/main/java/clew/traceables",
      sourceExtensions: SOURCE_EXTENSIONS,
      generate(
        specSets: readonly SpecSet[],
        context: GenerateContext,
      ): Promise<readonly GeneratedFile[]> {
        const files: GeneratedFile[] = [];
        for (const specSet of specSets) {
          files.push(renderEnumFile(specSet, context));
          for (const relation of RELATIONS) {
            files.push(renderAnnotationFile(specSet, relation, context));
          }
        }
        files.push(renderReadme(specSets));
        return Promise.resolve(files);
      },
      discover: discoverAnchors,
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
 * marker, group 2 the spec id.
 */
const CONSTANT_PATTERN = /(@Deprecated\s+)?[A-Za-z_]\w*\("([^"]+)"\)/g;

/**
 * Emits one spec set as a Java enum: the constant name from the spec's filename,
 * the value the id, read via `id()`. A `deprecated` spec's constant is kept and
 * marked `@Deprecated` so its anchors keep compiling.
 */
function renderEnumFile(
  specSet: SpecSet,
  context: GenerateContext,
): GeneratedFile {
  const enumName = setSymbolName(specSet.name);
  const lines = [...generatedHeader(GENERATOR_TYPE, specSet.name), ""];
  appendPackage(lines, context);
  lines.push(`public enum ${enumName} {`);
  lines.push(...enumConstants(specSet));
  lines.push(
    "",
    "  private final String id;",
    "",
    `  ${enumName}(String id) {`,
    "    this.id = id;",
    "  }",
    "",
    "  public String id() {",
    "    return this.id;",
    "  }",
    "}",
    "",
  );
  return { path: `${enumName}.java`, contents: lines.join("\n") };
}

/**
 * The enum's constant declarations: each `NAME("ID")`, a deprecated one preceded by
 * `@Deprecated`, the last closed with `;`. An empty set (no specs) emits a lone `;`
 * so the enum body is still valid Java.
 */
function enumConstants(specSet: SpecSet): string[] {
  if (specSet.specs.length === 0) {
    return ["  ;"];
  }
  const lines: string[] = [];
  specSet.specs.forEach((traceable, index) => {
    if (traceable.status === "deprecated") {
      lines.push("  @Deprecated");
    }
    const terminator = index === specSet.specs.length - 1 ? ";" : ",";
    lines.push(
      `  ${toMemberName(traceable.filename)}(${JSON.stringify(traceable.id)})${terminator}`,
    );
  });
  return lines;
}

/**
 * Emits one anchoring annotation for a relation and set — e.g. `@RealizesSw` over
 * `SwTraceables` — source-retained, repeatable, applicable to package/type/method/field.
 */
function renderAnnotationFile(
  specSet: SpecSet,
  relation: (typeof RELATIONS)[number],
  context: GenerateContext,
): GeneratedFile {
  const enumName = setSymbolName(specSet.name);
  const annotationName = `${relation}${toPascalCase(specSet.name)}`;
  const basePackage = toJavaPackage(context.outputDir);
  const lines = [...generatedHeader(GENERATOR_TYPE, specSet.name), ""];
  // The annotations live in an `annotation` subpackage beside the enums, so they
  // import the enum from the parent package (when there is one).
  if (basePackage.length > 0) {
    lines.push(`package ${basePackage}.annotation;`, "");
  }
  lines.push(
    "import static java.lang.annotation.ElementType.FIELD;",
    "import static java.lang.annotation.ElementType.METHOD;",
    "import static java.lang.annotation.ElementType.PACKAGE;",
    "import static java.lang.annotation.ElementType.TYPE;",
    "import static java.lang.annotation.RetentionPolicy.SOURCE;",
    "",
  );
  if (basePackage.length > 0) {
    lines.push(`import ${basePackage}.${enumName};`);
  }
  lines.push(
    "import java.lang.annotation.Repeatable;",
    "import java.lang.annotation.Retention;",
    "import java.lang.annotation.Target;",
    "",
    `@Repeatable(${annotationName}.Container.class)`,
    `@Target(${ANNOTATION_TARGETS})`,
    "@Retention(SOURCE)",
    `public @interface ${annotationName} {`,
    `  ${enumName}[] value();`,
    "",
    `  @Target(${ANNOTATION_TARGETS})`,
    "  @Retention(SOURCE)",
    "  @interface Container {",
    `    ${annotationName}[] value();`,
    "  }",
    "}",
    "",
  );
  return {
    path: `annotation/${annotationName}.java`,
    contents: lines.join("\n"),
  };
}

/** Appends the derived `package …;` statement to an enum file, when the output directory yields one. */
function appendPackage(lines: string[], context: GenerateContext): void {
  const javaPackage = toJavaPackage(context.outputDir);
  if (javaPackage.length > 0) {
    lines.push(`package ${javaPackage};`, "");
  }
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

/** Emits the README documenting the annotations for the Java target; deterministic. */
function renderReadme(specSets: readonly SpecSet[]): GeneratedFile {
  const example = exampleAnchor(specSets);
  const lines = [
    `<!-- THIS FILE IS ${GENERATED_MARKER} - DO NOT EDIT MANUALLY. Run \`clew spec\` to regenerate. -->`,
    "",
    "# Traceables",
    "",
    "Generated anchoring annotations for Java. Applying an annotation binds code to a",
    "spec id and `javac` checks it: remove a spec, regenerate, and every anchor that",
    "named the dropped enum member stops compiling. Do not edit by hand.",
    "",
    "The annotations express three relations — **realizes**, **verifies**, and",
    "**concerns** — defined in ADR-0004. For which relation to add when, see the",
    "`clew-anchor` workflow.",
    "",
    "## Shape",
    "",
    "There is one enum per spec set (`SwTraceables`, `ConTraceables`, …) and, per set,",
    "one annotation per relation bound to that set's enum: `@Realizes<Set>`,",
    "`@Verifies<Set>`, `@Concerns<Set>` (for example `@RealizesSw`). Each applies to a",
    "package, type, method, or field, and is repeatable. An anchor names one member or",
    "a `{…}` list from a set's enum; to anchor across sets, add each set's annotation.",
    "",
    "## Example",
    "",
    "```java",
    `${example}`,
    "void mint() {}",
    "```",
    "",
    "The available ids are the enum members in the `*Traceables.java` files here.",
    "",
  ];
  return { path: "README.md", contents: lines.join("\n") };
}

/** An example anchor drawn from the first traceable, for the README; a placeholder when there are none. */
function exampleAnchor(specSets: readonly SpecSet[]): string {
  for (const specSet of specSets) {
    const first = specSet.specs[0];
    if (first !== undefined) {
      const enumName = setSymbolName(specSet.name);
      return `@Realizes${toPascalCase(specSet.name)}(${enumName}.${toMemberName(first.filename)})`;
    }
  }
  return "@RealizesYourSet(YourSetTraceables.YOUR_SPEC_ID)";
}
