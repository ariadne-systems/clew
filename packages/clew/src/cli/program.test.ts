import { expect, test } from "vitest";
import { buildProgram } from "./program.js";

test("help output names the program", () => {
  const help = buildProgram().helpInformation();
  expect(help).toContain("clew");
});

test("an unknown option exits non-zero", () => {
  const program = buildProgram().exitOverride();
  expect(() => program.parse(["node", "ariadne", "--bogus"])).toThrow();
});
