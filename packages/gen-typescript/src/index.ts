import type {
  GenerateContext,
  GeneratedFile,
  Generator,
  SpecSet,
} from "@ariadne-thread/core";
import {
  classifyCFamily,
  GENERATED_MARKER,
  generatedHeader,
  parseGeneratedTraceables,
  setSymbolName,
  toMemberName,
} from "@ariadne-thread/core";
import type {
  Realizes,
  StkTraceables,
  SysTraceables,
} from "@ariadne-thread/trace";
import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import { discoverAnchors, SOURCE_EXTENSIONS } from "./discover.js";

// Module-level anchors — a concrete language generator behind the neutral
// interface is what makes the tool language-neutral and polyglot in practice.
type _Anchors =
  | Realizes<SysTraceables.SYS_008_LANGUAGE_NEUTRAL_EXTENSIBILITY, unknown>
  | Realizes<StkTraceables.STK_008_POLYGLOT_APPLICABILITY, unknown>;

/** This generator's type — its name and the `generator-type` in the provenance header. */
const GENERATOR_TYPE = "typescript";

/**
 * The TypeScript generator. For each spec set it emits a file
 * declaring a string enum whose members are that set's traceables — the member
 * name is derived from the spec's filename (so it carries the id and slug,
 * readable at the anchor site) and the value is the spec id — with a
 * generated-do-not-edit header naming the set. It also emits a helper module that
 * re-exports the enums, unions them into a combined `TraceableId`, and exports the
 * anchoring utility for the three relations of the taxonomy (ADR-0004):
 * `realizes` / `Realizes`, `verifies`, and `concerns` / `Concerns`. The function
 * markers wrap a value or apply as a class/method
 * decorator, and the `Realizes`/`Concerns` type markers anchor a type or interface;
 * each takes one member or a non-empty list, constrained to that union, so a
 * reference to a removed member fails to type-check (ADR-0001 D1). A plain (non-`const`) enum is used so the output survives per-file
 * transpilers and bundlers, and a `README.md` documents the markers for an author
 * (or agent) anchoring code. The output is deterministic and tool-owned;
 * the helpers are emitted, not shipped. File names are relative to the project's
 * configured output directory, which the core resolves.
 */
export const createTypeScriptGenerator: () => Generator = realizes(
  [
    SwTraceables.SW_018_TYPESCRIPT_OUTPUT,
    ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
    ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS,
    ConTraceables.CON_030_GENERATED_OUTPUT_INERT_TO_SCAN,
  ],
  (): Generator => {
    return {
      name: GENERATOR_TYPE,
      defaultOutputDir: "src/ariadne/traceables",
      sourceExtensions: SOURCE_EXTENSIONS,
      generate(
        specSets: readonly SpecSet[],
        _context: GenerateContext,
      ): Promise<readonly GeneratedFile[]> {
        const files = specSets.map(renderSetFile);
        files.push(renderHelperModule(specSets));
        files.push(renderReadme(specSets));
        return Promise.resolve(files);
      },
      discover: discoverAnchors,
      readTraceables: (files) =>
        parseGeneratedTraceables(files, MEMBER_PATTERN),
      // TypeScript/JavaScript have template and regex literals, so the lexer must
      // classify them to avoid mis-reading a `/` or backtick as a comment opener.
      findComments: (content) =>
        classifyCFamily(content, {
          templates: true,
          regex: true,
          textBlocks: false,
        }).comments,
    };
  },
);

/**
 * A generated enum member, optionally preceded by a `@deprecated` JSDoc:
 * `NAME = "ID"`. `parseGeneratedTraceables` reads it back as the dual of generate —
 * capture group 1 is the deprecation marker, group 2 the spec id.
 */
const MEMBER_PATTERN = /(\/\*\* @deprecated \*\/\s+)?[A-Za-z_]\w* = "([^"]+)"/g;

/** Emits one spec set as a string enum: member name from the spec's filename, value the id. */
function renderSetFile(specSet: SpecSet): GeneratedFile {
  const members = specSet.specs.flatMap((traceable) => {
    const member = `  ${toMemberName(traceable.filename)} = ${JSON.stringify(traceable.id)},`;
    // A deprecated spec's member stays (so its anchors keep compiling) but carries
    // a JSDoc `@deprecated`, which tsc and editors surface on every use.
    return traceable.status === "deprecated"
      ? ["  /** @deprecated */", member]
      : [member];
  });
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
    "// The three relations and every marker form are documented in the README.md",
    "// in this folder (ADR-0004).",
    "",
    "/**",
    " * Marks a type or interface as **realizing** one or more spec ids; the type is unchanged.",
    " *",
    " * @example",
    ` * type AnchoredState = Realizes<${example}, { sequences: number[] }>;`,
    " *",
    " * @example",
    ` * interface IdStrategy extends Realizes<${example}, {}> { mint(): void; }`,
    " */",
    "export type Realizes<Id extends TraceableIds, T> = T & { readonly __realizes?: Id };",
    "",
    "/**",
    " * Marks a type or interface as **concerning** one or more spec ids — coupled to",
    " * the spec without realizing it; the type is unchanged.",
    " *",
    " * @example",
    ` * interface IdStrategy extends Concerns<${example}, {}> { mint(): void; }`,
    " */",
    "export type Concerns<Id extends TraceableIds, T> = T & { readonly __concerns?: Id };",
    "",
    "/**",
    " * Anchors code that **realizes** one or more spec ids; a removed id fails to compile.",
    " *",
    " * Called with a value it returns the value unchanged (wrap a function or",
    " * constant). Called with only the ids it returns a no-op decorator (annotate a",
    " * class or method).",
    " *",
    " * @example",
    ` * export const mint = realizes(${example}, (type: string, count: number): string[] => []);`,
    " *",
    " * @example",
    ` * class Minter { @realizes(${example}) mint() {} }`,
    " */",
    "export function realizes<Value>(ids: TraceableIds, value: Value): Value;",
    "export function realizes(",
    "  ids: TraceableIds,",
    "): (target: unknown, propertyKey?: unknown, descriptor?: unknown) => void;",
    "export function realizes(_ids: TraceableIds, ...rest: unknown[]): unknown {",
    "  if (rest.length === 1) {",
    "    return rest[0];",
    "  }",
    "  return () => {};",
    "}",
    "",
    "/**",
    " * Anchors code that **concerns** one or more spec ids — coupled to the spec",
    " * without realizing or verifying it; a removed id fails to compile.",
    " *",
    " * Same two forms as `realizes`: a value or function wrapper, or — called with",
    " * only the ids — a no-op class/method decorator. The anchor is existence-checked",
    " * only; nothing exercises it (ADR-0004).",
    " *",
    " * @example",
    ` * export const render = concerns(${example}, (n: number): string => String(n));`,
    " *",
    " * @example",
    ` * class Minter { @concerns(${example}) render() {} }`,
    " */",
    "export function concerns<Value>(ids: TraceableIds, value: Value): Value;",
    "export function concerns(",
    "  ids: TraceableIds,",
    "): (target: unknown, propertyKey?: unknown, descriptor?: unknown) => void;",
    "export function concerns(_ids: TraceableIds, ...rest: unknown[]): unknown {",
    "  if (rest.length === 1) {",
    "    return rest[0];",
    "  }",
    "  return () => {};",
    "}",
    "",
    "/**",
    " * Anchors a test that **verifies** one or more spec ids and runs it unchanged.",
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

/**
 * Emits the README documenting the markers for the TypeScript target.
 * The marker API is the same every run, so the file is deterministic; an example
 * uses a real member when one exists.
 */
function renderReadme(specSets: readonly SpecSet[]): GeneratedFile {
  const example = exampleMember(specSets) ?? "YourTraceables.YOUR_SPEC_ID";
  const lines = [
    `<!-- THIS FILE IS ${GENERATED_MARKER} - DO NOT EDIT MANUALLY. Run \`clew spec\` to regenerate. -->`,
    "",
    "# Traceables",
    "",
    "Generated anchoring markers for TypeScript. Referencing a marker binds code to",
    "a spec id and `tsc` checks it: remove a spec, regenerate, and every anchor that",
    "named it stops compiling. Do not edit by hand.",
    "",
    "The markers express three relations — **realizes** (`realizes` / `Realizes`),",
    "**verifies** (`verifies`), and **concerns** (`concerns` / `Concerns`) — defined",
    "in ADR-0004. For which relation to add when, see the `clew-anchor` workflow.",
    "",
    "## By what you anchor",
    "",
    "| element | realizes | verifies | concerns |",
    "| --- | --- | --- | --- |",
    "| value / function | `realizes(ids, value)` | — | `concerns(ids, value)` |",
    "| class / method | `@realizes(ids)` | — | `@concerns(ids)` |",
    "| test | — | `verifies(ids, run)` | — |",
    "| type | `Realizes<ids, T>` | — | `Concerns<ids, T>` |",
    "| interface | `extends Realizes<ids, unknown>` | — | `extends Concerns<ids, unknown>` |",
    "",
    "`ids` is a single member or a non-empty list — `realizes([A, B], value)`,",
    "`Realizes<[A, B], T>`. Import the markers and the `*Traceables` enums from this",
    "folder's module.",
    "",
    "## Examples",
    "",
    "```ts",
    "// realizes — a function",
    `export const mint = realizes(${example}, (count: number): string[] => []);`,
    "",
    "// realizes — a class",
    `@realizes(${example})`,
    "export class Minter {}",
    "",
    "// realizes — an interface (combine several ids into ONE list)",
    `export interface Strategy extends Realizes<${example}, unknown> {`,
    "  run(): void;",
    "}",
    "",
    "// verifies — a test",
    `verifies(${example}, () => {`,
    '  test("holds", () => {});',
    "});",
    "",
    "// concerns — a value coupled to a spec it does not implement",
    `export const DEFAULT = concerns(${example}, 3);`,
    "```",
    "",
    "## Notes",
    "",
    "- On an interface, combine several ids into one list — two separate",
    "  `extends Realizes<...>` clauses collide on the marker property and fail to compile.",
    "- The available ids are the enum members in the `*Traceables.ts` files here.",
    "",
  ];
  return { path: "README.md", contents: lines.join("\n") };
}

/** An example anchor reference (`<Enum>.<MEMBER>`) drawn from the first traceable, for the JSDoc examples. */
function exampleMember(specSets: readonly SpecSet[]): string | undefined {
  for (const specSet of specSets) {
    const first = specSet.specs[0];
    if (first !== undefined) {
      return `${setSymbolName(specSet.name)}.${toMemberName(first.filename)}`;
    }
  }
  return undefined;
}
