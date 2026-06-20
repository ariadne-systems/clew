import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rmdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ErrorCode, mint, mintTemporary } from "./index.js";

type Paths = { configFile: string; stateFile: string };

async function tempPaths(
  idGeneration?: { mode?: string; padding?: number },
  lenses?: Array<{ id: string; description: string }>,
): Promise<Paths> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-mint-"));
  const configFile = join(dir, ".ariadnerc.json");
  const config: Record<string, unknown> = {};
  if (idGeneration) {
    config.idGeneration = idGeneration;
  }
  if (lenses !== undefined) {
    config.lenses = lenses;
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
  verifies(
    [
      SwTraceables.SW_001_ALLOCATE_SEQUENCE_NUMBERS,
      SwTraceables.SW_002_MINT_SEQUENTIAL_IDS,
      ConTraceables.CON_002_SEQUENCE_NUMBER_NEVER_REUSED,
    ],
    () => {
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
        const other = await mint("NF", 1, { configFile, stateFile });

        expect(other).toEqual(["NF-001"]);
        expect(await readHighWaterMark(stateFile, "NF")).toBe(1);
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
    },
  );
});

describe("padding and formatting", () => {
  verifies(ConTraceables.CON_003_PADDING_CONFIGURED, () => {
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
});

describe("strategy selection", () => {
  verifies(ArchTraceables.ARCH_001_PLUGGABLE_ID_STRATEGY, () => {
    test("opaque mode is recognised but fails with an explicit message", async () => {
      const { configFile, stateFile } = await tempPaths({ mode: "opaque" });

      await expect(mint("SW", 1, { configFile, stateFile })).rejects.toThrow(
        /not yet implemented/i,
      );
    });
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
  verifies(ConTraceables.CON_004_IDS_RETURNED_ONLY_AFTER_PERSIST, () => {
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
});

describe("prefix validation", () => {
  verifies(ConTraceables.CON_005_ID_MATCHES_CONFIGURED_PATTERN, () => {
    test("a configured lens mints", async () => {
      const { configFile, stateFile } = await tempPaths({ padding: 3 });

      const ids = await mint("SW", 1, { configFile, stateFile });

      expect(ids).toEqual(["SW-001"]);
    });

    test("an unconfigured prefix is rejected with code E_INVALID_TYPE and nothing is allocated", async () => {
      const { configFile, stateFile } = await tempPaths({ padding: 3 });

      await expect(
        mint("sw", 1, { configFile, stateFile }),
      ).rejects.toMatchObject({
        code: ErrorCode.INVALID_TYPE,
        message: expect.stringMatching(/not a configured prefix/i),
      });
      expect(existsSync(stateFile)).toBe(false);
    });

    test("a prefix outside the configured set is rejected", async () => {
      const { configFile, stateFile } = await tempPaths({ padding: 3 });

      await expect(mint("ZZZ", 1, { configFile, stateFile })).rejects.toThrow(
        /not a configured prefix/i,
      );
    });

    test("a rejected prefix leaves an existing high-water mark unchanged", async () => {
      const { configFile, stateFile } = await tempPaths({ padding: 3 });
      await mint("SW", 2, { configFile, stateFile });

      await expect(mint("sw", 1, { configFile, stateFile })).rejects.toThrow();

      expect(await readHighWaterMark(stateFile, "SW")).toBe(2);
    });

    test("configuring a custom lens makes its prefix mintable", async () => {
      const { configFile, stateFile } = await tempPaths({ padding: 3 }, [
        { id: "RISK", description: "A risk spec." },
      ]);

      const ids = await mint("RISK", 1, { configFile, stateFile });

      expect(ids).toEqual(["RISK-001"]);
    });
  });
});

describe("temporary minting", () => {
  verifies(
    [
      SwTraceables.SW_005_MINT_TEMPORARY_IDS,
      ConTraceables.CON_007_TEMPORARY_ID_UNBOUND,
    ],
    () => {
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

      test("a temporary id carries the reserved marker and is not a bound-id form", async () => {
        const { configFile, stateFile } = await tempPaths({ padding: 3 });

        const ids = await mintTemporary("SW", 3, { configFile, stateFile });

        for (const id of ids) {
          expect(id).toMatch(/^SW-TMP-[0-9a-f]+$/);
          expect(id).not.toMatch(/^SW-\d+$/);
        }
      });

      test("an unconfigured prefix is rejected with code E_INVALID_TYPE and nothing is produced", async () => {
        const { configFile, stateFile } = await tempPaths({ padding: 3 });

        await expect(
          mintTemporary("sw", 1, { configFile, stateFile }),
        ).rejects.toMatchObject({
          code: ErrorCode.INVALID_TYPE,
          message: expect.stringMatching(/not a configured prefix/i),
        });
        expect(existsSync(stateFile)).toBe(false);
      });

      test("a non-positive count is rejected with code E_INVALID_COUNT", async () => {
        const { configFile, stateFile } = await tempPaths({ padding: 3 });

        await expect(
          mintTemporary("SW", 0, { configFile, stateFile }),
        ).rejects.toMatchObject({ code: ErrorCode.INVALID_COUNT });
      });
    },
  );
});

describe("reserved temporary marker", () => {
  verifies(ConTraceables.CON_008_TMP_MARKER_RESERVED, () => {
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
      const { configFile, stateFile } = await tempPaths({ padding: 3 }, [
        { id: "TMPX", description: "A TMPX spec." },
      ]);

      const ids = await mintTemporary("TMPX", 2, { configFile, stateFile });

      expect(ids).toHaveLength(2);
      for (const id of ids) {
        expect(id).toMatch(/^TMPX-TMP-[0-9a-f]+$/);
      }
    });
  });
});
