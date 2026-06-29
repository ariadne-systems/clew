import { extname } from "node:path";
import { ArchTraceables, realizes } from "@ariadne-thread/trace";

/** A comment found in a source file: its text and the 1-based line it begins on. */
export type CommentSpan = {
  text: string;
  line: number;
};

/** Finds the comment spans in a source file's content — language-specific. */
export type CommentFinder = (content: string) => CommentSpan[];

/**
 * The C-family comment finder (TypeScript, JavaScript, and their variants):
 * single-line and block comments, skipping an opener that sits inside a string or
 * template literal, so code is never misread as a comment. A regex literal can
 * still be mis-scanned, but that only matters if it contains a spec-id-shaped
 * token, which essentially never happens.
 */
const cFamily: CommentFinder = (content: string): CommentSpan[] => {
  const spans: CommentSpan[] = [];
  let line = 1;
  let index = 0;
  while (index < content.length) {
    const char = content[index];
    const next = content[index + 1];
    if (char === "\n") {
      line += 1;
      index += 1;
    } else if (char === '"' || char === "'" || char === "`") {
      index = skipString(content, index, char, () => {
        line += 1;
      });
    } else if (char === "/" && next === "/") {
      const start = index + 2;
      let end = start;
      while (end < content.length && content[end] !== "\n") {
        end += 1;
      }
      spans.push({ text: content.slice(start, end), line });
      index = end;
    } else if (char === "/" && next === "*") {
      const start = index + 2;
      let end = start;
      while (
        end + 1 < content.length &&
        !(content[end] === "*" && content[end + 1] === "/")
      ) {
        end += 1;
      }
      const text = content.slice(start, end);
      spans.push({ text, line });
      line += count(text, "\n");
      index = end + 2;
    } else {
      index += 1;
    }
  }
  return spans;
};

/** Advances past a string/template literal opened at `index`, returning the index after it. */
function skipString(
  content: string,
  index: number,
  quote: string,
  onNewline: () => void,
): number {
  let i = index + 1;
  while (i < content.length && content[i] !== quote) {
    if (content[i] === "\\") {
      i += 2;
    } else {
      if (content[i] === "\n") {
        onNewline();
      }
      i += 1;
    }
  }
  return i + 1;
}

/** The number of times `needle` occurs in `text`. */
function count(text: string, needle: string): number {
  return text.split(needle).length - 1;
}

/** The comment finders clew ships, keyed by file extension. */
const FINDERS: ReadonlyMap<string, CommentFinder> = new Map([
  [".ts", cFamily],
  [".tsx", cFamily],
  [".mts", cFamily],
  [".cts", cFamily],
  [".js", cFamily],
  [".jsx", cFamily],
  [".mjs", cFamily],
  [".cjs", cFamily],
]);

/**
 * The comment finder for a file, by extension, or undefined when no finder is
 * registered for its language. A project supports a new language by registering a
 * finder; the spec-id-in-comment check is unchanged.
 */
export const commentFinderFor: (file: string) => CommentFinder | undefined =
  realizes(
    ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS,
    (file: string): CommentFinder | undefined => FINDERS.get(extname(file)),
  );
