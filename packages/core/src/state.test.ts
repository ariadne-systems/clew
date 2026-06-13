import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { withState } from "./index.js";

async function tempStateFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-state-"));
  return join(dir, "state.json");
}

async function readState(
  file: string,
): Promise<{ sequences: Record<string, number>; [section: string]: unknown }> {
  return JSON.parse(await readFile(file, "utf8"));
}

test("a missing file is treated as empty state", async () => {
  const file = await tempStateFile();
  const sequences = await withState((state) => ({ ...state.sequences }), {
    file,
  });
  expect(sequences).toEqual({});
});

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
