import {
  ArchTraceables,
  ConTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { expect, test } from "vitest";
import { AriadneError, ErrorCode } from "./index.js";

verifies(ConTraceables.CON_006_ERROR_CODE_STABILITY, () => {
  test("the released error codes keep their stable string values", () => {
    expect({ ...ErrorCode }).toEqual({
      INVALID_COUNT: "E_INVALID_COUNT",
      INVALID_TYPE: "E_INVALID_TYPE",
      STATE_WRITE_FAILED: "E_STATE_WRITE_FAILED",
      RESERVED_TYPE: "E_RESERVED_TYPE",
      NO_CONFIG: "E_NO_CONFIG",
      UNKNOWN_GENERATOR: "E_UNKNOWN_GENERATOR",
      SPEC_SET_OVERLAP: "E_SPEC_SET_OVERLAP",
      SPEC_SET_UNMATCHED: "E_SPEC_SET_UNMATCHED",
      DRAFT_NOT_FOUND: "E_DRAFT_NOT_FOUND",
      ENTITY_DRAFT_UNSUPPORTED: "E_ENTITY_DRAFT_UNSUPPORTED",
      INVALID_EXCLUSION_PATTERN: "E_INVALID_EXCLUSION_PATTERN",
      INVALID_SPEC_STATUS: "E_INVALID_SPEC_STATUS",
      INVALID_AUTHOR: "E_INVALID_AUTHOR",
      INVALID_OPTIONS: "E_INVALID_OPTIONS",
      DUPLICATE_SPEC_ID: "E_DUPLICATE_SPEC_ID",
    });
  });
});

verifies(
  [
    ArchTraceables.ARCH_002_STABLE_ERROR_CODES,
    SysTraceables.SYS_006_DIAGNOSTIC_CLARITY,
  ],
  () => {
    test("an AriadneError carries its code and message", () => {
      const error = new AriadneError(ErrorCode.INVALID_COUNT, "bad count");

      expect(error.code).toBe("E_INVALID_COUNT");
      expect(error.message).toBe("bad count");
      expect(error).toBeInstanceOf(Error);
    });

    test("an AriadneError preserves the underlying cause", () => {
      const cause = new Error("disk full");

      const error = new AriadneError(
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
