import { ArchTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { type CFamilyDialect, classifyCFamily } from "../index.js";

const TS: CFamilyDialect = { templates: true, regex: true, textBlocks: false };
const JAVA: CFamilyDialect = {
  templates: false,
  regex: false,
  textBlocks: true,
};

function commentsOf(source: string, dialect: CFamilyDialect): string[] {
  return classifyCFamily(source, dialect).comments.map((span) => span.text);
}

describe("classifyCFamily — comment extraction", () => {
  verifies(ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS, () => {
    test("a line comment yields its text and 1-based start line", () => {
      const result = classifyCFamily("const a = 1; // hi there\n", TS);
      expect(result.comments).toEqual([{ text: " hi there", line: 1 }]);
    });

    test("a block comment yields its text and the line it opens on", () => {
      const result = classifyCFamily("a;\nb;\n/*\n inside\n*/\nc;\n", TS);
      expect(result.comments).toEqual([{ text: "\n inside\n", line: 3 }]);
    });

    test("a `//` inside a string is not a comment", () => {
      expect(commentsOf('const url = "http://example.com";\n', TS)).toEqual([]);
    });

    test("a `/* */`-shaped sequence inside a string is not a comment", () => {
      expect(commentsOf('const s = "/* not */";\n', TS)).toEqual([]);
    });

    test("a comment-like token inside a template literal is not a comment", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal ${} is the source fixture being lexed
      expect(commentsOf("const s = `http://x ${1}`;\n", TS)).toEqual([]);
    });

    test("a comment inside an interpolation block is a comment", () => {
      // biome-ignore lint/suspicious/noTemplateCurlyInString: literal ${} is the source fixture being lexed
      expect(commentsOf("const s = `${ 1 // note\n}`;\n", TS)).toEqual([
        " note",
      ]);
    });

    test("a regex literal is not a comment, but a `//` after it is", () => {
      expect(commentsOf("const re = /a\\/b/; // why\n", TS)).toEqual([" why"]);
    });

    test("a comment-like token inside a Java text block is not a comment", () => {
      const source = [
        'String s = """',
        "  // not a comment",
        '  """;',
        "  // real",
        "}",
      ].join("\n");
      expect(commentsOf(source, JAVA)).toEqual([" real"]);
    });

    test("Java treats `/` as division, so a trailing comment is still found", () => {
      expect(commentsOf("int x = a / b; // half\n", JAVA)).toEqual([" half"]);
    });
  });
});

describe("classifyCFamily — code masking", () => {
  verifies(SwTraceables.SW_021_DISCOVER_ANCHORS_TYPESCRIPT, () => {
    test("comments, strings, and regex are blanked while code and newlines survive", () => {
      const source = 'const re = /x/; const s = "y"; // c\nok();';
      const { masked } = classifyCFamily(source, TS);

      expect(masked.length).toBe(source.length);
      expect(masked).toContain("const re =");
      expect(masked).toContain("const s =");
      expect(masked).toContain("ok();");
      expect(masked).toContain("\n");
      expect(masked).not.toContain("/x/");
      expect(masked).not.toContain('"y"');
      expect(masked).not.toContain("// c");
    });

    test("a marker call survives in code but is blanked inside a comment", () => {
      const { masked } = classifyCFamily("realizes(A); // realizes(B)\n", TS);
      expect(masked).toContain("realizes(A)");
      expect(masked).not.toContain("realizes(B)");
    });
  });
});

describe("classifyCFamily — edge cases and known limits", () => {
  verifies(ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS, () => {
    test("empty input yields no comments and an empty mask", () => {
      const result = classifyCFamily("", TS);
      expect(result.comments).toEqual([]);
      expect(result.masked).toBe("");
    });

    test("an unterminated block comment is captured whole, not truncated", () => {
      const result = classifyCFamily("code; /* tail content", TS);
      expect(result.comments).toEqual([{ text: " tail content", line: 1 }]);
    });

    test("an unterminated string stops at end of line and does not swallow the next", () => {
      expect(commentsOf('const s = "oops\n// after\n', TS)).toEqual([" after"]);
    });

    test("a `/` after a postfix `++` is mis-scanned as a regex (known lexical-scan limit)", () => {
      // The single-char lookback cannot tell `++` from a binary `+`, so the `/`
      // opens a false regex that closes on the `//` slash and the line comment is
      // not recognized. Documented here as a known limit of the non-AST scan; a fix
      // would require real tokenization (ADR-0005 D3).
      expect(commentsOf("count++ / total // missed\n", TS)).toEqual([]);
    });
  });
});
