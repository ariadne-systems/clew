/** A comment found in a source file: its text, and the 1-based line it begins on. */
export interface CommentSpan {
  text: string;
  line: number;
}

/**
 * Which C-family lexical forms a language has. TypeScript and JavaScript have
 * template literals (backtick) and regex literals; Java has neither, but has text
 * blocks (`"""…"""`). Each language enables only its own forms, so a `/` in a Java
 * string is never read as a regex, and a comment-like token inside a Java text block
 * is never read as a comment.
 */
export interface CFamilyDialect {
  templates: boolean;
  regex: boolean;
  /** The language has Java-style text blocks: `"""…"""` spanning lines. */
  textBlocks: boolean;
}

/** A classified source: the code with non-code blanked, the comment spans, and line offsets. */
export interface ClassifiedSource {
  /** The source with every comment, string, template, and regex blanked (newlines kept). */
  masked: string;
  /** The comment spans, in source order. */
  comments: CommentSpan[];
  /** The character offset of each line start, for mapping a `masked` index to a line. */
  lineStarts: number[];
}

/**
 * Classifies C-family source into code and comments in one lexical pass, returning
 * both views: the code with every comment, string, template literal, and regex
 * literal blanked — newlines preserved so positions stay accurate, the view a marker
 * scan reads — and the comment spans, the view the spec-id-in-comment check reads.
 * `dialect` enables the forms a language actually has, so a `/` inside a Java string
 * is never read as a regex and a backtick is never read as a template.
 */
export function classifyCFamily(
  source: string,
  dialect: CFamilyDialect,
): ClassifiedSource {
  const out = source.split("");
  const comments: { text: string; start: number }[] = [];
  const length = source.length;
  const blank = (index: number): void => {
    const char = source[index];
    if (char !== undefined && char !== "\n" && char !== "\r") {
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
      const start = index;
      const textStart = index + 2;
      while (index < length && source[index] !== "\n") {
        blank(index);
        index += 1;
      }
      comments.push({ text: source.slice(textStart, index), start });
      continue;
    }
    if (char === "/" && next === "*") {
      const start = index;
      blank(index);
      blank(index + 1);
      index += 2;
      const textStart = index;
      while (
        index < length &&
        !(source[index] === "*" && source[index + 1] === "/")
      ) {
        blank(index);
        index += 1;
      }
      comments.push({ text: source.slice(textStart, index), start });
      blank(index);
      blank(index + 1);
      index += 2;
      continue;
    }
    if (
      dialect.textBlocks &&
      char === '"' &&
      source[index + 1] === '"' &&
      source[index + 2] === '"'
    ) {
      index = scanTextBlock(source, index, blank);
      previous = '"';
      continue;
    }
    if (char === '"' || char === "'") {
      index = scanQuoted(source, index, char, blank);
      previous = '"';
      continue;
    }
    if (dialect.templates && char === "`") {
      blank(index);
      templates.push({ braceDepth: 0 });
      index += 1;
      continue;
    }
    if (dialect.regex && char === "/" && startsRegex(previous)) {
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
  const lineStarts = computeLineStarts(source);
  return {
    masked: out.join(""),
    comments: comments.map(({ text, start }) => ({
      text,
      line: lineOf(lineStarts, start),
    })),
    lineStarts,
  };
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

/**
 * Scans a Java text block (`"""…"""`) to its closing triple quote, blanking the whole
 * literal so a comment-like token inside it is never read as a comment. Honors `\`
 * escapes so an escaped quote does not start the closing delimiter; an unterminated
 * block is consumed to the end of input.
 */
function scanTextBlock(
  source: string,
  start: number,
  blank: (index: number) => void,
): number {
  blank(start);
  blank(start + 1);
  blank(start + 2);
  let index = start + 3;
  while (
    index < source.length &&
    !(
      source[index] === '"' &&
      source[index + 1] === '"' &&
      source[index + 2] === '"'
    )
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
  blank(index);
  blank(index + 1);
  blank(index + 2);
  return index + 3;
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
 * (e.g. after `return`) is the known gap of a lexical scan, not an AST.
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

/** The 1-based line number containing the given character index, by binary search over `lineStarts`. */
export function lineOf(lineStarts: number[], index: number): number {
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
