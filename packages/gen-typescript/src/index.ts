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

/** This generator's type — its name and the `generator-type` in the provenance header. */
const GENERATOR_TYPE = "typescript";

/**
 * The TypeScript generator (SW-018; ARCH-003). For each spec set it emits a file
 * declaring a string enum whose members are that set's traceables — the member
 * name is derived from the spec's filename (so it carries the id and slug,
 * readable at the anchor site) and the value is the spec id — with a
 * generated-do-not-edit header naming the set. It also emits a helper module that
 * re-exports the enums, unions them into a combined `TraceableId`, and exports the
 * anchoring utility — `Traces` (type marker), `traces` (value/function wrapper
 * or class/method decorator), `verifies` (test wrapper), each taking one member
 * or a non-empty list — constrained to that union, so a
 * reference to a removed member fails to type-check (ADR-0001 D1). A plain (non-`const`) enum is used so the output survives per-file
 * transpilers and bundlers. The output is deterministic and tool-owned (CON-012);
 * the helpers are emitted, not shipped. File names are relative to the project's
 * configured output directory, which the core resolves (ENT-002).
 */
export function createTypeScriptGenerator(): Generator {
  return {
    name: GENERATOR_TYPE,
    defaultOutputDir: "src/ariadne/traceables",
    generate(
      specSets: readonly SpecSet[],
      _context: GenerateContext,
    ): Promise<readonly GeneratedFile[]> {
      const files = specSets.map(renderSetFile);
      files.push(renderHelperModule(specSets));
      return Promise.resolve(files);
    },
  };
}

/** Emits one spec set as a string enum: member name from the spec's filename, value the id. */
function renderSetFile(specSet: SpecSet): GeneratedFile {
  const members = specSet.traceables.map(
    (traceable) =>
      `  ${toMemberName(traceable.filename)} = ${JSON.stringify(traceable.id)},`,
  );
  const lines = [
    ...generatedHeader(GENERATOR_TYPE, specSet.name),
    "",
    `export enum ${setSymbolName(specSet.name)} {`,
    ...members,
    "}",
    "",
  ];
  return {
    path: `${setSymbolName(specSet.name)}.ts`,
    contents: lines.join("\n"),
  };
}

/**
 * Emits the helper module: re-exports each set's enum, unions them into
 * `TraceableId`, and exports the anchoring utility constrained to it.
 */
function renderHelperModule(specSets: readonly SpecSet[]): GeneratedFile {
  const names = specSets.map((specSet) => setSymbolName(specSet.name));
  const lines: string[] = [...generatedHeader(GENERATOR_TYPE), ""];
  for (const name of names) {
    lines.push(`import { ${name} } from "./${name}.js";`);
  }
  lines.push("");
  if (names.length > 0) {
    lines.push(`export { ${names.join(", ")} };`, "");
  }
  const union = names.length > 0 ? names.join(" | ") : "never";
  const example = exampleMember(specSets) ?? "YourTraceables.YOUR_SPEC_ID";
  lines.push(
    `export type TraceableId = ${union};`,
    "",
    "/** A single id, or a non-empty list of ids — an anchor must name at least one spec. */",
    "export type TraceableIds = TraceableId | readonly [TraceableId, ...TraceableId[]];",
    "",
    "/**",
    " * Marks a type as tracing one or more spec ids; the type is unchanged.",
    " *",
    " * @example",
    ` * type AnchoredState = Traces<${example}, { sequences: number[] }>;`,
    " */",
    "export type Traces<Id extends TraceableId, T> = T & { readonly __traces?: Id };",
    "",
    "/**",
    " * Anchors code to one or more spec ids; a removed id fails to compile.",
    " *",
    " * Called with a value it returns the value unchanged (wrap a function or",
    " * constant). Called with only the ids it returns a no-op decorator (annotate a",
    " * class or method). Either way the ids are referenced, so deleting a spec",
    " * breaks the anchor.",
    " *",
    " * @example",
    ` * export const mint = traces(${example}, (type: string, count: number): string[] => []);`,
    " *",
    " * @example",
    ` * class Minter { @traces(${example}) mint() {} }`,
    " */",
    "export function traces<Value>(ids: TraceableIds, value: Value): Value;",
    "export function traces(",
    "  ids: TraceableIds,",
    "): (target: unknown, propertyKey?: unknown, descriptor?: unknown) => void;",
    "export function traces(_ids: TraceableIds, ...rest: unknown[]): unknown {",
    "  if (rest.length === 1) {",
    "    return rest[0];",
    "  }",
    "  return () => {};",
    "}",
    "",
    "/**",
    " * Anchors a test to one or more spec ids and runs it unchanged.",
    " *",
    " * @example",
    ` * verifies(${example}, () => { test("holds", () => {}); });`,
    " */",
    "export function verifies(ids: TraceableIds, run: () => void): void {",
    "  run();",
    "}",
    "",
  );
  return { path: "index.ts", contents: lines.join("\n") };
}

/** The enum and file symbol name for a spec set, e.g. set `SW` → `SwTraceables`; always a valid identifier. */
function setSymbolName(setName: string): string {
  return toIdentifier(`${toPascalCase(setName)}Traceables`);
}

/** An example anchor reference (`<Enum>.<MEMBER>`) drawn from the first traceable, for the JSDoc examples. */
function exampleMember(specSets: readonly SpecSet[]): string | undefined {
  for (const specSet of specSets) {
    const first = specSet.traceables[0];
    if (first !== undefined) {
      return `${setSymbolName(specSet.name)}.${toMemberName(first.filename)}`;
    }
  }
  return undefined;
}
