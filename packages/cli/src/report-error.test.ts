import { AriadneError, ErrorCode } from "@ariadne-thread/core";
import { SwTraceables, verifies } from "@ariadne-thread/trace";
import { expect, test } from "vitest";
import { formatError } from "./report-error.js";

verifies(SwTraceables.SW_004_ERROR_REPORTING, () => {
  test("a coded error is rendered as error[CODE]: message", () => {
    const error = new AriadneError(
      ErrorCode.INVALID_COUNT,
      "count must be > 0",
    );

    expect(formatError(error)).toBe(
      "error[E_INVALID_COUNT]: count must be > 0",
    );
  });

  test("a plain error falls back to its message", () => {
    expect(formatError(new Error("boom"))).toBe("boom");
  });

  test("a non-error value falls back to its string form", () => {
    expect(formatError("nope")).toBe("nope");
  });
});
