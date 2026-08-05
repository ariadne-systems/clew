import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  NfTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { TEMP_SUFFIX } from "../fs/atomic-write.js";
import { ErrorCode, withState } from "../index.js";

async function tempStateFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-state-"));
  return join(dir, "state.json");
}

async function readState(
  file: string,
): Promise<{ sequences: Record<string, number>; [section: string]: unknown }> {
  return JSON.parse(await readFile(file, "utf8"));
}

describe("loading", () => {
  verifies(ConTraceables.CON_001_STATE_FILE_VERSION_CONTROLLED, () => {
    test("a missing file is treated as empty state", async () => {
      const file = await tempStateFile();
      const sequences = await withState((state) => ({ ...state.sequences }), {
        file,
      });
      expect(sequences).toEqual({});
    });

    test("a state file that is not valid JSON is reported with E_INVALID_JSON and its path", async () => {
      const file = await tempStateFile();
      await writeFile(file, "{ not valid", "utf8");

      await expect(
        withState((state) => state.sequences, { file }),
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_JSON, location: file });
    });
  });
});

describe("persistence", () => {
  verifies(SysTraceables.SYS_004_CONFIGURATION_AND_STATE, () => {
    test("mutations are persisted across sessions", async () => {
      const file = await tempStateFile();
      await withState(
        (state) => {
          state.sequences.SW = 3;
        },
        { file },
      );
      const value = await withState((state) => state.sequences.SW, { file });
      expect(value).toBe(3);
    });

    test("saving preserves sections the caller did not touch", async () => {
      const file = await tempStateFile();
      await writeFile(
        file,
        JSON.stringify({ sequences: { SW: 1 }, lastScannedCommit: "abc123" }),
        "utf8",
      );
      await withState(
        (state) => {
          state.sequences.SW = 2;
        },
        { file },
      );
      const state = await readState(file);
      expect(state.sequences.SW).toBe(2);
      expect(state.lastScannedCommit).toBe("abc123");
    });

    test("a failing run does not persist", async () => {
      const file = await tempStateFile();
      await withState(
        (state) => {
          state.sequences.SW = 1;
        },
        { file },
      );
      await expect(
        withState(
          (state) => {
            state.sequences.SW = 99;
            throw new Error("boom");
          },
          { file },
        ),
      ).rejects.toThrow("boom");
      const value = await withState((state) => state.sequences.SW, { file });
      expect(value).toBe(1);
    });
  });
});

describe("atomic state write", () => {
  verifies(NfTraceables.NF_002_ATOMIC_STATE_WRITE, () => {
    test("a failing write leaves the prior state file valid and unchanged", async () => {
      const file = await tempStateFile();
      await withState(
        (state) => {
          state.sequences.SW = 5;
        },
        { file },
      );
      // Block the atomic writer's staging file so the save fails mid-write: a
      // temp-then-rename writer leaves `file` untouched (the rename never runs),
      // whereas a naive writeFile straight to `file` would ignore the blocker,
      // overwrite it with SW=99, and not throw — so this fails unless the write is atomic.
      await mkdir(`${file}${TEMP_SUFFIX}`, { recursive: true });
      await expect(
        withState(
          (state) => {
            state.sequences.SW = 99;
          },
          { file },
        ),
      ).rejects.toThrow();
      const state = await readState(file);
      expect(state.sequences.SW).toBe(5);
    });
  });
});

describe("concurrency", () => {
  verifies(NfTraceables.NF_001_STATE_ACCESS_MUTUALLY_EXCLUSIVE, () => {
    test("concurrent sessions are serialized, with no lost updates", async () => {
      const file = await tempStateFile();
      await Promise.all(
        Array.from({ length: 10 }, () =>
          withState(
            (state) => {
              state.sequences.N = (state.sequences.N ?? 0) + 1;
            },
            { file },
          ),
        ),
      );
      const value = await withState((state) => state.sequences.N, { file });
      expect(value).toBe(10);
    });
  });
});
