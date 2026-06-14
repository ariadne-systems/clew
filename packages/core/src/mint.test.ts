import { mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "vitest";
import { mint } from "./index.js";

type Paths = { configFile: string; stateFile: string };

async function tempPaths(idGeneration?: {
  mode?: string;
  padding?: number;
}): Promise<Paths> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-mint-"));
  const configFile = join(dir, ".ariadnerc.json");
  const config = idGeneration ? { idGeneration } : {};
  await writeFile(configFile, JSON.stringify(config), "utf8");
  return { configFile, stateFile: join(dir, "state.json") };
}

async function readHighWaterMark(
  stateFile: string,
  prefix: string,
): Promise<number | undefined> {
  const state = JSON.parse(await readFile(stateFile, "utf8")) as {
    sequences: Record<string, number>;
  };
  return state.sequences[prefix];
}

test("a fresh prefix yields the numbers 1..N and advances the high-water mark", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  const ids = await mint("SW", 3, { configFile, stateFile });

  expect(ids).toEqual(["SW-001", "SW-002", "SW-003"]);
  expect(await readHighWaterMark(stateFile, "SW")).toBe(3);
});

test("a later allocation continues after the previous high-water mark", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  await mint("SW", 3, { configFile, stateFile });
  const next = await mint("SW", 2, { configFile, stateFile });

  expect(next).toEqual(["SW-004", "SW-005"]);
  expect(await readHighWaterMark(stateFile, "SW")).toBe(5);
});

test("an unseen prefix is created automatically without prior registration", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  await mint("SW", 2, { configFile, stateFile });
  const other = await mint("HW", 1, { configFile, stateFile });

  expect(other).toEqual(["HW-001"]);
  expect(await readHighWaterMark(stateFile, "HW")).toBe(1);
});

test("a batch of N for a fresh prefix returns N consecutive ids", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  const ids = await mint("SW", 5, { configFile, stateFile });

  expect(ids).toEqual(["SW-001", "SW-002", "SW-003", "SW-004", "SW-005"]);
});

test("the configured padding width renders the number", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 5 });

  const ids = await mint("SW", 1, { configFile, stateFile });

  expect(ids).toEqual(["SW-00001"]);
});

test("changing the configured padding changes the rendering", async () => {
  const narrow = await tempPaths({ padding: 2 });
  const wide = await tempPaths({ padding: 6 });

  const narrowIds = await mint("SW", 1, narrow);
  const wideIds = await mint("SW", 1, wide);

  expect(narrowIds).toEqual(["SW-01"]);
  expect(wideIds).toEqual(["SW-000001"]);
});

test("mint defaults to a padding of 3 when configuration omits it", async () => {
  const { configFile, stateFile } = await tempPaths({ mode: "sequential" });

  const ids = await mint("SW", 3, { configFile, stateFile });

  expect(ids).toEqual(["SW-001", "SW-002", "SW-003"]);
});

test("numbers are never reused across separate invocations", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  const first = await mint("SW", 2, { configFile, stateFile });
  const second = await mint("SW", 2, { configFile, stateFile });

  expect(new Set([...first, ...second]).size).toBe(4);
  expect(second).toEqual(["SW-003", "SW-004"]);
});

test("opaque mode is recognised but fails with an explicit message", async () => {
  const { configFile, stateFile } = await tempPaths({ mode: "opaque" });

  await expect(mint("SW", 1, { configFile, stateFile })).rejects.toThrow(
    /not yet implemented/i,
  );
});

test("a non-positive count is rejected", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });

  await expect(mint("SW", 0, { configFile, stateFile })).rejects.toThrow(
    /positive integer/i,
  );
});

test("when the save fails the mint returns no ids and the high-water mark is unchanged", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });
  await mint("SW", 2, { configFile, stateFile });

  // Occupy the atomic-write temp path (NF-002) with a directory so the save
  // cannot complete; the allocation advance is therefore never persisted.
  await mkdir(`${stateFile}.tmp`);

  await expect(mint("SW", 3, { configFile, stateFile })).rejects.toThrow();
  expect(await readHighWaterMark(stateFile, "SW")).toBe(2);
});

test("numbers a failed mint would have used are allocated on the next attempt, not lost", async () => {
  const { configFile, stateFile } = await tempPaths({ padding: 3 });
  await mint("SW", 2, { configFile, stateFile });

  const tmp = `${stateFile}.tmp`;
  await mkdir(tmp);
  await expect(mint("SW", 3, { configFile, stateFile })).rejects.toThrow();
  await rmdir(tmp);

  const recovered = await mint("SW", 3, { configFile, stateFile });
  expect(recovered).toEqual(["SW-003", "SW-004", "SW-005"]);
});
