import { SwTraceables, verifies } from "@ariadne-thread/trace";
import { expect, test } from "vitest";
import { ClewError, ErrorCode } from "../index.js";
import { formatError } from "./report-error.js";

verifies(SwTraceables.SW_004_ERROR_REPORTING, () => {
  test("a coded error is rendered as error[CODE]: message", () => {
    const error = new ClewError(ErrorCode.INVALID_COUNT, "count must be > 0");

    expect(formatError(error)).toBe(
      "error[E_INVALID_COUNT]: count must be > 0",
    );
  });

  test("a coded error renders location, note, and help beneath the summary", () => {
    const error = new ClewError(
      ErrorCode.INVALID_SPEC_STATUS,
      'unrecognized spec status "actives"',
      {
        location: "docs/spec/specs/ARCH-003.md",
        note: "a spec's status must be a recognized state",
        help: "set **Status** to planned, active, or deprecated",
      },
    );

    expect(formatError(error)).toBe(
      [
        'error[E_INVALID_SPEC_STATUS]: unrecognized spec status "actives"',
        "  --> docs/spec/specs/ARCH-003.md",
        "  = note: a spec's status must be a recognized state",
        "  = help: set **Status** to planned, active, or deprecated",
      ].join("\n"),
    );
  });

  test("each help line renders as its own = help:", () => {
    const error = new ClewError(
      ErrorCode.SCHEMA_VIOLATION,
      "document does not conform to its schema",
      {
        location: "docs/spec/specs/ARCH-003.md",
        help: [
          "fix the reported fields",
          "run `clew check` to see all validation issues at once",
        ],
      },
    );

    expect(formatError(error)).toBe(
      [
        "error[E_SCHEMA_VIOLATION]: document does not conform to its schema",
        "  --> docs/spec/specs/ARCH-003.md",
        "  = help: fix the reported fields",
        "  = help: run `clew check` to see all validation issues at once",
      ].join("\n"),
    );
  });

  test("a plain error falls back to its message", () => {
    expect(formatError(new Error("boom"))).toBe("boom");
  });

  test("a non-error value falls back to its string form", () => {
    expect(formatError("nope")).toBe("nope");
  });
});
