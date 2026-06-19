import { describe, expect, test } from "vitest";
import { toIdentifier, toMemberName, toPascalCase } from "./index.js";

describe("toPascalCase", () => {
  test("joins segments into PascalCase", () => {
    expect(toPascalCase("sw-core")).toBe("SwCore");
    expect(toPascalCase("SW")).toBe("Sw");
    expect(toPascalCase("commands")).toBe("Commands");
  });
});

describe("toIdentifier", () => {
  test("replaces runs of non-alphanumeric characters with a single underscore", () => {
    expect(toIdentifier("a b.c")).toBe("a_b_c");
  });

  test("prefixes a leading digit so the result is a valid identifier", () => {
    expect(toIdentifier("2024Core")).toBe("_2024Core");
  });
});

describe("toMemberName", () => {
  test("derives an UPPER_SNAKE name from a filename, dropping the extension", () => {
    expect(toMemberName("SW-002-mint-ids.md")).toBe("SW_002_MINT_IDS");
  });

  test("yields a valid identifier even from a digit-leading filename", () => {
    expect(toMemberName("123-x.md")).toBe("_123_X");
  });
});
