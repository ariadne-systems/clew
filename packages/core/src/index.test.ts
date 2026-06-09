import { expect, test } from "vitest";
import { coreVersion } from "./index.js";

test("coreVersion returns the placeholder version", () => {
  expect(coreVersion()).toBe("0.0.0");
});
