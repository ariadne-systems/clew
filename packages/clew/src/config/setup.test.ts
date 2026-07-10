import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { mint, setup } from "../index.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "clew-setup-"));
}

describe("setup", () => {
  verifies(
    [
      SwTraceables.SW_011_SCAFFOLD_DEFAULT_CONFIG,
      ConTraceables.CON_010_SETUP_NEVER_OVERWRITES,
    ],
    () => {
      test("scaffolds the default configuration and layout directories", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");

        const result = await setup({ configFile });

        expect(result.created).toBe(true);
        const config = JSON.parse(await readFile(configFile, "utf8")) as {
          lenses: { id: string }[];
          layout: { stories: { prefix: string } };
        };
        expect(config.lenses.map((lens) => lens.id)).toEqual([
          "STK",
          "SYS",
          "SW",
          "ARCH",
          "NF",
          "CON",
        ]);
        expect(config.layout.stories.prefix).toBe("STR");
        expect(existsSync(join(dir, "docs", "spec", "stories"))).toBe(true);
        expect(existsSync(join(dir, "docs", "spec", "specs"))).toBe(true);
        expect(existsSync(join(dir, "docs", "spec", "drafts"))).toBe(true);
      });

      test("never overwrites an existing configuration", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");
        await writeFile(configFile, '{"custom":true}', "utf8");

        const result = await setup({ configFile });

        expect(result.created).toBe(false);
        expect(await readFile(configFile, "utf8")).toBe('{"custom":true}');
      });

      test("the written configuration round-trips: a default lens mints against it", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");
        const stateFile = join(dir, ".clew", "state.json");
        await setup({ configFile });

        const ids = await mint("SW", 1, { configFile, stateFile });

        expect(ids).toEqual(["SW-001"]);
      });
    },
  );
});
