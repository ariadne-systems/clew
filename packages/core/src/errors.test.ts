import { expect, test } from "vitest";
import { AriadneError, ErrorCode } from "./index.js";

test("an AriadneError carries its code and message", () => {
  const error = new AriadneError(ErrorCode.INVALID_COUNT, "bad count");

  expect(error.code).toBe("E_INVALID_COUNT");
  expect(error.message).toBe("bad count");
  expect(error).toBeInstanceOf(Error);
});

test("an AriadneError preserves the underlying cause", () => {
  const cause = new Error("disk full");

  const error = new AriadneError(ErrorCode.STATE_WRITE_FAILED, "write failed", {
    cause,
  });

  expect(error.cause).toBe(cause);
});
