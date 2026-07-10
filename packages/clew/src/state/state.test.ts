import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  NfTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { withState } from "../index.js";

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
  });
});

describe("persistence", () => {
  verifies(
    [
      NfTraceables.NF_002_ATOMIC_STATE_WRITE,
      SysTraceables.SYS_004_CONFIGURATION_AND_STATE,
    ],
    () => {
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
    },
  );
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
