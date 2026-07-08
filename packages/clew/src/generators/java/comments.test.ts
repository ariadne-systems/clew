import { ArchTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { createJavaGenerator } from "./index.js";

describe("Java comment detection", () => {
  verifies(ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS, () => {
    test("a comment-like token inside a text block is not a comment", () => {
      const generator = createJavaGenerator();
      const source = [
        "class X {",
        '  String sql = """',
        "      // SW-123 not a comment",
        "      /* SW-456 also not */",
        '      """;',
        "  // SW-789 is a real comment",
        "}",
      ].join("\n");

      const comments = generator.findComments(source);
      const text = comments.map((span) => span.text).join("\n");

      expect(text).not.toContain("SW-123");
      expect(text).not.toContain("SW-456");
      expect(text).toContain("SW-789");
    });

    test("ordinary line and block comments are found", () => {
      const generator = createJavaGenerator();
      const source = [
        "// leading SW-001",
        "class X {",
        "  /* block SW-002 */",
        "  int x = 1; // trailing SW-003",
        "}",
      ].join("\n");

      const found = generator
        .findComments(source)
        .flatMap((span) =>
          [...span.text.matchAll(/SW-\d+/g)].map((match) => match[0]),
        );

      expect(found).toEqual(["SW-001", "SW-002", "SW-003"]);
    });
  });
});
