import {
  ArchTraceables,
  ConTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { expect, test } from "vitest";
import { ClewError, ErrorCode } from "./index.js";

verifies(ConTraceables.CON_006_ERROR_CODE_STABILITY, () => {
  test("the released error codes keep their stable string values", () => {
    expect({ ...ErrorCode }).toEqual({
      INVALID_COUNT: "E_INVALID_COUNT",
      INVALID_TYPE: "E_INVALID_TYPE",
      STATE_WRITE_FAILED: "E_STATE_WRITE_FAILED",
      RESERVED_TYPE: "E_RESERVED_TYPE",
      NO_CONFIG: "E_NO_CONFIG",
      INVALID_JSON: "E_INVALID_JSON",
      UNKNOWN_GENERATOR: "E_UNKNOWN_GENERATOR",
      UNKNOWN_HARNESS: "E_UNKNOWN_HARNESS",
      SPEC_SET_OVERLAP: "E_SPEC_SET_OVERLAP",
      SPEC_SET_UNMATCHED: "E_SPEC_SET_UNMATCHED",
      DRAFT_NOT_FOUND: "E_DRAFT_NOT_FOUND",
      INVALID_EXCLUSION_PATTERN: "E_INVALID_EXCLUSION_PATTERN",
      INVALID_SPEC_STATUS: "E_INVALID_SPEC_STATUS",
      INVALID_AUTHOR: "E_INVALID_AUTHOR",
      INVALID_OPTIONS: "E_INVALID_OPTIONS",
      DUPLICATE_SPEC_ID: "E_DUPLICATE_SPEC_ID",
      UNRESOLVED_REFERENCE: "E_UNRESOLVED_REFERENCE",
      INVALID_SCHEMA: "E_INVALID_SCHEMA",
      SCHEMA_VIOLATION: "E_SCHEMA_VIOLATION",
    });
  });
});

verifies(
  [
    ArchTraceables.ARCH_002_STABLE_ERROR_CODES,
    SysTraceables.SYS_006_DIAGNOSTIC_CLARITY,
  ],
  () => {
    test("an ClewError carries its code and message", () => {
      const error = new ClewError(ErrorCode.INVALID_COUNT, "bad count");

      expect(error.code).toBe("E_INVALID_COUNT");
      expect(error.message).toBe("bad count");
      expect(error).toBeInstanceOf(Error);
    });

    test("an ClewError preserves the underlying cause", () => {
      const cause = new Error("disk full");

      const error = new ClewError(
        ErrorCode.STATE_WRITE_FAILED,
        "write failed",
        {
          cause,
        },
      );

      expect(error.cause).toBe(cause);
    });
  },
);
