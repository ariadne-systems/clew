import type { AnchorLocation, SourceFile } from "@ariadne-thread/core";
import {
  classifyCFamily,
  lineOf,
  memberIds,
  relationOfVerb,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";

/** File extensions the TypeScript generator scans — the TypeScript and JavaScript C-family. */
export const SOURCE_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
];

/**
 * Discovers the TypeScript anchors in the given sources, the dual of
 * generation (ADR-0005 D2). It classifies each source with the shared C-family
 * lexer and matches markers only in code, never inside a comment, string, template
 * literal, or regex literal (ADR-0005 D3; ADR-0004 D4). From each marker it reads
 * only the leading id argument — a member or a `[…]` list — bracket-aware, ignoring
 * the wrapped value, and derives the spec id from the member name itself (its
 * leading `<PREFIX>_<NUMBER>`), with no lookup into the generated definitions.
 */
export const discoverAnchors: (
  sources: readonly SourceFile[],
) => AnchorLocation[] = realizes(
  SwTraceables.SW_021_DISCOVER_ANCHORS_TYPESCRIPT,
  (sources: readonly SourceFile[]): AnchorLocation[] => {
    const anchors: AnchorLocation[] = [];
    for (const source of sources) {
      collectFromFile(source, anchors);
    }
    return anchors;
  },
);

/** The function and decorator marker forms — `realizes(`, `@verifies(`, `@concerns(`, … */
const CALL_FORM = /(^|[^A-Za-z0-9_$.])(realizes|verifies|concerns)\s*\(/g;
/** The type marker forms — `Realizes<`, `Concerns<`. */
const TYPE_FORM = /(^|[^A-Za-z0-9_$.])(Realizes|Concerns)\s*</g;

function collectFromFile(source: SourceFile, out: AnchorLocation[]): void {
  const { masked, lineStarts } = classifyCFamily(source.contents, {
    templates: true,
    regex: true,
    textBlocks: false,
  });
  collectForm(masked, CALL_FORM, ")", source.path, lineStarts, out);
  collectForm(masked, TYPE_FORM, ">", source.path, lineStarts, out);
}

/**
 * Matches one marker form across the masked source and records an anchor per id.
 * The leading argument is read from the open delimiter, bracket-aware, so the
 * wrapped value (which may contain parentheses or commas) is never read.
 */
function collectForm(
  masked: string,
  form: RegExp,
  close: string,
  file: string,
  lineStarts: number[],
  out: AnchorLocation[],
): void {
  form.lastIndex = 0;
  let match = form.exec(masked);
  while (match !== null) {
    const verb = match[2] ?? "";
    const relation = relationOfVerb(verb);
    const verbIndex = match.index + (match[1]?.length ?? 0);
    const line = lineOf(lineStarts, verbIndex);
    const argument = leadingArgument(
      masked,
      match.index + match[0].length,
      close,
    );
    for (const id of memberIds(argument)) {
      out.push({ id, relation, file, line });
    }
    match = form.exec(masked);
  }
}

/**
 * Reads the leading argument from just after the open delimiter: the text up to
 * the first top-level comma, or the marker's own close — whichever comes first —
 * tracking `()[]{}` depth so a `[…]` id list and a nested value are bounded
 * correctly. Returns only that leading slice, so the wrapped value is excluded.
 */
function leadingArgument(masked: string, start: number, close: string): string {
  let depth = 0;
  let index = start;
  while (index < masked.length) {
    const char = masked[index] ?? "";
    if (char === "(" || char === "[" || char === "{") {
      depth += 1;
    } else if (char === ")" || char === "]" || char === "}") {
      if (depth === 0) {
        break;
      }
      depth -= 1;
    } else if (depth === 0 && (char === "," || char === close)) {
      break;
    }
    index += 1;
  }
  return masked.slice(start, index);
}
