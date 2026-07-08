import { realizes, SwTraceables } from "@ariadne-thread/trace";
import type { AnchorLocation, SourceFile } from "../../spec/generator.js";
import { memberIds, relationOfVerb } from "../../spec/identifiers.js";
import { classifyCFamily, lineOf } from "../../text/c-family-lexer.js";

/** File extensions the Java generator scans for anchors. */
export const SOURCE_EXTENSIONS: readonly string[] = [".java"];

/**
 * An anchoring annotation form — `@RealizesSw(`, `@VerifiesCon(`, `@ConcernsArch(`, …:
 * an `@`, one of the three relation verbs, the set suffix, then the value's `(`.
 * The relation is the leading verb; the set suffix is not read, since the id comes
 * from the referenced member.
 */
const ANNOTATION_FORM = /@(Realizes|Verifies|Concerns)[A-Za-z0-9_]*\s*\(/g;

/**
 * Discovers the Java anchors in the given sources, the dual of generation
 * (ADR-0005 D2). It classifies each source with the shared C-family lexer in its
 * Java dialect — text blocks, no template or regex literals — and matches the
 * annotation forms only in code, never inside a comment, string, char literal, or
 * text block (ADR-0004 D4). From each annotation it reads the referenced member(s)
 * — one or a `{…}` list — and derives each spec id from the member name itself (its
 * leading `<PREFIX>_<NUMBER>`), with no lookup into the generated enums.
 */
export const discoverAnchors: (
  sources: readonly SourceFile[],
) => AnchorLocation[] = realizes(
  SwTraceables.SW_038_DISCOVER_ANCHORS_JAVA,
  (sources: readonly SourceFile[]): AnchorLocation[] => {
    const anchors: AnchorLocation[] = [];
    for (const source of sources) {
      collectFromFile(source, anchors);
    }
    return anchors;
  },
);

function collectFromFile(source: SourceFile, out: AnchorLocation[]): void {
  const { masked, lineStarts } = classifyCFamily(source.contents, {
    templates: false,
    regex: false,
    textBlocks: true,
  });
  ANNOTATION_FORM.lastIndex = 0;
  let match = ANNOTATION_FORM.exec(masked);
  while (match !== null) {
    const relation = relationOfVerb(match[1] ?? "");
    const line = lineOf(lineStarts, match.index);
    const argument = annotationValue(masked, match.index + match[0].length);
    for (const id of memberIds(argument)) {
      out.push({ id, relation, file: source.path, line });
    }
    match = ANNOTATION_FORM.exec(masked);
  }
}

/**
 * Reads an annotation's value: the text from just after the opening `(` to its
 * matching `)`, so a single member or a `{…}` list is captured whole. A Java
 * annotation value holds no parentheses, so a simple paren-depth count suffices.
 */
function annotationValue(masked: string, start: number): string {
  let depth = 1;
  let index = start;
  while (index < masked.length) {
    const char = masked[index] ?? "";
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
    }
    index += 1;
  }
  return masked.slice(start, index);
}
