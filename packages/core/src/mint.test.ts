import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ErrorCode, mint, mintTemporary } from "./index.js";

type Paths = { configFile: string; stateFile: string };

async function tempPaths(
  idGeneration?: { mode?: string; padding?: number },
  tokenPattern?: string,
): Promise<Paths> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-mint-"));
  const configFile = join(dir, ".ariadnerc.json");
  const config: Record<string, unknown> = {};
  if (idGeneration) {
    config.idGeneration = idGeneration;
  }
  if (tokenPattern !== undefined) {
    config.idToken = { pattern: tokenPattern };
  }
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

describe("sequential allocation", () => {
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

  test("numbers are never reused across separate invocations", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    const first = await mint("SW", 2, { configFile, stateFile });
    const second = await mint("SW", 2, { configFile, stateFile });

    expect(new Set([...first, ...second]).size).toBe(4);
    expect(second).toEqual(["SW-003", "SW-004"]);
  });
});

describe("padding and formatting", () => {
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
});

describe("strategy selection", () => {
  test("opaque mode is recognised but fails with an explicit message", async () => {
    const { configFile, stateFile } = await tempPaths({ mode: "opaque" });

    await expect(mint("SW", 1, { configFile, stateFile })).rejects.toThrow(
      /not yet implemented/i,
    );
  });
});

describe("count validation", () => {
  test("a non-positive count is rejected with code E_INVALID_COUNT", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await expect(
      mint("SW", 0, { configFile, stateFile }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_COUNT,
      message: expect.stringMatching(/positive integer/i),
    });
  });
});

describe("persistence on save failure", () => {
  test("when the save fails the mint returns no ids and the high-water mark is unchanged", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });
    await mint("SW", 2, { configFile, stateFile });

    // Occupy the atomic-write temp path (NF-002) with a directory so the save
    // cannot complete; the allocation advance is therefore never persisted.
    await mkdir(`${stateFile}.tmp`);

    await expect(
      mint("SW", 3, { configFile, stateFile }),
    ).rejects.toMatchObject({ code: ErrorCode.STATE_WRITE_FAILED });
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
});

describe("type validation", () => {
  test("a type that is a valid prefix under the configured pattern mints", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[A-Z]{2,4}-[0-9]{3}",
    );

    const ids = await mint("SW", 1, { configFile, stateFile });

    expect(ids).toEqual(["SW-001"]);
  });

  test("a lowercase type is rejected with code E_INVALID_TYPE and nothing is allocated", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[A-Z]{2,4}-[0-9]{3}",
    );

    await expect(
      mint("sw", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_TYPE,
      message: expect.stringMatching(/not a valid id prefix/i),
    });
    expect(existsSync(stateFile)).toBe(false);
  });

  test("a type longer than the configured pattern allows is rejected", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[A-Z]{2,4}-[0-9]{3}",
    );

    await expect(mint("TOOLONG", 1, { configFile, stateFile })).rejects.toThrow(
      /not a valid id prefix/i,
    );
  });

  test("a rejected type leaves an existing high-water mark unchanged", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[A-Z]{2,4}-[0-9]{3}",
    );
    await mint("SW", 2, { configFile, stateFile });

    await expect(mint("sw", 1, { configFile, stateFile })).rejects.toThrow();

    expect(await readHighWaterMark(stateFile, "SW")).toBe(2);
  });

  test("changing the configured pattern changes which types are accepted", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[a-z]{2,4}-[0-9]{3}",
    );

    const ids = await mint("sw", 1, { configFile, stateFile });

    expect(ids).toEqual(["sw-001"]);
  });
});

describe("temporary minting", () => {
  test("mints N temporary ids of the form <TYPE>-TMP-<opaque>", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    const ids = await mintTemporary("SW", 3, { configFile, stateFile });

    expect(ids).toHaveLength(3);
    for (const id of ids) {
      expect(id).toMatch(/^SW-TMP-[0-9a-f]+$/);
    }
  });

  test("the opaque suffixes within a call are all distinct", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    const ids = await mintTemporary("SW", 5, { configFile, stateFile });

    expect(new Set(ids).size).toBe(5);
  });

  test("temporary minting advances no sequence and writes no state file", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await mintTemporary("SW", 3, { configFile, stateFile });

    expect(existsSync(stateFile)).toBe(false);
  });

  test("temporary minting leaves an existing bound high-water mark unchanged", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });
    await mint("SW", 2, { configFile, stateFile });

    await mintTemporary("SW", 3, { configFile, stateFile });

    expect(await readHighWaterMark(stateFile, "SW")).toBe(2);
    const next = await mint("SW", 1, { configFile, stateFile });
    expect(next).toEqual(["SW-003"]);
  });

  test("a temporary id does not match the configured id token pattern", async () => {
    const pattern = "[A-Z]{2,4}-[0-9]{3}";
    const { configFile, stateFile } = await tempPaths({ padding: 3 }, pattern);

    const ids = await mintTemporary("SW", 3, { configFile, stateFile });

    const matcher = new RegExp(`^(?:${pattern})$`);
    for (const id of ids) {
      expect(matcher.test(id)).toBe(false);
    }
  });

  test("a malformed type is rejected with code E_INVALID_TYPE and nothing is produced", async () => {
    const { configFile, stateFile } = await tempPaths(
      { padding: 3 },
      "[A-Z]{2,4}-[0-9]{3}",
    );

    await expect(
      mintTemporary("sw", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({
      code: ErrorCode.INVALID_TYPE,
      message: expect.stringMatching(/not a valid id prefix/i),
    });
    expect(existsSync(stateFile)).toBe(false);
  });

  test("a non-positive count is rejected with code E_INVALID_COUNT", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await expect(
      mintTemporary("SW", 0, { configFile, stateFile }),
    ).rejects.toMatchObject({ code: ErrorCode.INVALID_COUNT });
  });
});

describe("reserved temporary marker", () => {
  test("bound minting rejects a type equal to the reserved marker with code E_RESERVED_TYPE", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await expect(
      mint("TMP", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({
      code: ErrorCode.RESERVED_TYPE,
      message: expect.stringMatching(/reserved/i),
    });
  });

  test("temporary minting rejects a type equal to the reserved marker with code E_RESERVED_TYPE", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await expect(
      mintTemporary("TMP", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({ code: ErrorCode.RESERVED_TYPE });
  });

  test("a type containing the reserved marker as a segment is rejected", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    await expect(
      mintTemporary("MY-TMP", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({ code: ErrorCode.RESERVED_TYPE });
    await expect(
      mint("MY-TMP", 1, { configFile, stateFile }),
    ).rejects.toMatchObject({ code: ErrorCode.RESERVED_TYPE });
  });

  test("a type that merely contains the letters but not as a segment is accepted", async () => {
    const { configFile, stateFile } = await tempPaths({ padding: 3 });

    const ids = await mintTemporary("TMPX", 2, { configFile, stateFile });

    expect(ids).toHaveLength(2);
    for (const id of ids) {
      expect(id).toMatch(/^TMPX-TMP-[0-9a-f]+$/);
    }
  });
});
