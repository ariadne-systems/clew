import { describe, expect, test } from "vitest";
import { escapeRegExp } from "./escape-regexp.js";

describe("escapeRegExp", () => {
  test("backslash-escapes every regex metacharacter", () => {
    expect(escapeRegExp("^$.*+?()[]{}|\\")).toBe(
      "\\^\\$\\.\\*\\+\\?\\(\\)\\[\\]\\{\\}\\|\\\\",
    );
  });

  test("leaves a string without metacharacters unchanged", () => {
    expect(escapeRegExp("SW-032")).toBe("SW-032");
    expect(escapeRegExp("plain words 123")).toBe("plain words 123");
  });

  test("returns an empty string unchanged", () => {
    expect(escapeRegExp("")).toBe("");
  });

  test("the escaped value matches the original literally in a RegExp", () => {
    const raw = "a.b\\c (d) [e] {f} g|h ^i $j *k +l ?m";
    expect(new RegExp(escapeRegExp(raw)).test(raw)).toBe(true);
  });

  test("an escaped metacharacter loses its special meaning", () => {
    const dotPattern = new RegExp(escapeRegExp("a.c"));
    expect(dotPattern.test("a.c")).toBe(true);
    expect(dotPattern.test("axc")).toBe(false);
  });
});
