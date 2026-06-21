import type {
  AnchorLocation,
  Relation,
  SourceFile,
} from "@ariadne-thread/core";
import { realizes, SwTraceables } from "@ariadne-thread/trace";

/** File extensions the TypeScript generator scans for anchors. */
export const SOURCE_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
];

/**
 * Discovers the TypeScript anchors in the given sources (SW-021), the dual of
 * generation (ADR-0005 D2). It is a lightweight lexical scan: the source is
 * classified into regions and markers are matched only in code, never inside a
 * comment, string, template literal, or regex literal (ADR-0005 D3; ADR-0004 D4).
 * From each marker it reads only the leading id argument — a member or a `[…]`
 * list — bracket-aware, ignoring the wrapped value, and derives the spec id from
 * the member name itself (its leading `<PREFIX>_<NUMBER>`), with no lookup into
 * the generated definitions.
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
/** A generated enum member encodes its id as the leading `<PREFIX>_<NUMBER>`. */
const MEMBER_ID = /\b([A-Za-z]+)_(\d+)/g;

function collectFromFile(source: SourceFile, out: AnchorLocation[]): void {
  const masked = maskNonCode(source.contents);
  const lineStarts = computeLineStarts(source.contents);
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
    const relation = relationOf(verb);
    const verbIndex = match.index + (match[1]?.length ?? 0);
    const line = lineOf(lineStarts, verbIndex);
    const argument = leadingArgument(
      masked,
      match.index + match[0].length,
      close,
    );
    for (const id of idsIn(argument)) {
      out.push({ id, relation, file, line });
    }
    match = form.exec(masked);
  }
}

/** The relation a marker verb expresses; the type forms map to the same relations. */
function relationOf(verb: string): Relation {
  const lowered = verb.toLowerCase();
  if (lowered === "verifies") {
    return "verifies";
  }
  if (lowered === "concerns") {
    return "concerns";
  }
  return "realizes";
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

/** Derives the spec ids referenced in a leading argument from the member names. */
function idsIn(argument: string): string[] {
  const ids: string[] = [];
  MEMBER_ID.lastIndex = 0;
  let match = MEMBER_ID.exec(argument);
  while (match !== null) {
    ids.push(`${match[1]}-${match[2]}`);
    match = MEMBER_ID.exec(argument);
  }
  return ids;
}

/**
 * Replaces every character inside a comment, string, template-literal text, or
 * regex literal with a space — preserving newlines so line numbers stay
 * accurate — and leaves code, including template `${…}` interpolations, intact.
 * Template and regex literals are the TypeScript-specific forms a naive match
 * would mis-read, so they are classified, not assumed away (ADR-0005 D3).
 */
function maskNonCode(source: string): string {
  const out = source.split("");
  const length = source.length;
  const blank = (index: number): void => {
    const char = source[index];
    if (char !== "\n" && char !== "\r") {
      out[index] = " ";
    }
  };
  // One frame per open template literal; `braceDepth` is the interpolation depth
  // (0 = scanning the literal's text, >0 = inside a `${…}` code interpolation).
  const templates: { braceDepth: number }[] = [];
  let previous = "";
  let index = 0;
  while (index < length) {
    const frame = templates[templates.length - 1];
    if (frame !== undefined && frame.braceDepth === 0) {
      index = scanTemplateText(source, index, frame, templates, blank);
      if (templates.length === 0 || templates[templates.length - 1] !== frame) {
        previous = "`";
      }
      continue;
    }
    const char = source[index] ?? "";
    const next = source[index + 1] ?? "";
    if (char === "/" && next === "/") {
      while (index < length && source[index] !== "\n") {
        blank(index);
        index += 1;
      }
      continue;
    }
    if (char === "/" && next === "*") {
      blank(index);
      blank(index + 1);
      index += 2;
      while (
        index < length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        blank(index);
        index += 1;
      }
      blank(index);
      blank(index + 1);
      index += 2;
      continue;
    }
    if (char === '"' || char === "'") {
      index = scanQuoted(source, index, char, blank);
      previous = '"';
      continue;
    }
    if (char === "`") {
      blank(index);
      templates.push({ braceDepth: 0 });
      index += 1;
      continue;
    }
    if (char === "/" && startsRegex(previous)) {
      index = scanRegex(source, index, blank);
      previous = "r";
      continue;
    }
    if (frame !== undefined && frame.braceDepth > 0) {
      if (char === "{") {
        frame.braceDepth += 1;
      } else if (char === "}") {
        frame.braceDepth -= 1;
        if (frame.braceDepth === 0) {
          blank(index);
          index += 1;
          continue;
        }
      }
    }
    if (!isWhitespace(char)) {
      previous = char;
    }
    index += 1;
  }
  return out.join("");
}

/** Scans a template literal's text, handling escapes, `${` (enter code), and the closing backtick. */
function scanTemplateText(
  source: string,
  start: number,
  frame: { braceDepth: number },
  templates: { braceDepth: number }[],
  blank: (index: number) => void,
): number {
  let index = start;
  while (index < source.length) {
    const char = source[index];
    if (char === "\\") {
      blank(index);
      blank(index + 1);
      index += 2;
      continue;
    }
    if (char === "`") {
      blank(index);
      templates.pop();
      return index + 1;
    }
    if (char === "$" && source[index + 1] === "{") {
      blank(index);
      blank(index + 1);
      frame.braceDepth = 1;
      return index + 2;
    }
    blank(index);
    index += 1;
  }
  return index;
}

/** Scans a quoted string to its closing quote (or end of line if unterminated). */
function scanQuoted(
  source: string,
  start: number,
  quote: string,
  blank: (index: number) => void,
): number {
  blank(start);
  let index = start + 1;
  while (
    index < source.length &&
    source[index] !== quote &&
    source[index] !== "\n"
  ) {
    if (source[index] === "\\") {
      blank(index);
      blank(index + 1);
      index += 2;
      continue;
    }
    blank(index);
    index += 1;
  }
  if (index < source.length && source[index] === quote) {
    blank(index);
    index += 1;
  }
  return index;
}

/** Scans a regex literal to its closing slash, honoring escapes and character classes, then its flags. */
function scanRegex(
  source: string,
  start: number,
  blank: (index: number) => void,
): number {
  blank(start);
  let index = start + 1;
  let inClass = false;
  while (index < source.length && source[index] !== "\n") {
    const char = source[index];
    if (char === "\\") {
      blank(index);
      blank(index + 1);
      index += 2;
      continue;
    }
    if (char === "[") {
      inClass = true;
    } else if (char === "]") {
      inClass = false;
    } else if (char === "/" && !inClass) {
      blank(index);
      index += 1;
      break;
    }
    blank(index);
    index += 1;
  }
  while (index < source.length && isFlag(source[index] ?? "")) {
    blank(index);
    index += 1;
  }
  return index;
}

/**
 * Whether a `/` at this point begins a regex literal: true at the start of input
 * or after a punctuator that cannot end an expression. After a value (identifier,
 * number, closing bracket, string) a `/` is division. A regex in keyword position
 * (e.g. after `return`) is the known gap of a lexical scan, not an AST (ADR-0005 D3).
 */
function startsRegex(previous: string): boolean {
  return previous === "" || "([{,;:?=+-*/%&|^!~<>".includes(previous);
}

function isWhitespace(char: string): boolean {
  return char === " " || char === "\t" || char === "\n" || char === "\r";
}

function isFlag(char: string): boolean {
  return char >= "a" && char <= "z";
}

function computeLineStarts(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] === "\n") {
      starts.push(index + 1);
    }
  }
  return starts;
}

/** The 1-based line number containing the given character index. */
function lineOf(lineStarts: number[], index: number): number {
  let low = 0;
  let high = lineStarts.length - 1;
  let answer = 0;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if ((lineStarts[mid] ?? 0) <= index) {
      answer = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return answer + 1;
}
