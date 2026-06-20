import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArchTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";

// Collects the core's production sources (every `.ts` under src, excluding test
// files), so the boundary check below reads exactly what ships in the core.
async function collectSourceFiles(dir: string): Promise<string[]> {
  const entries: Dirent[] = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(path)));
    } else if (entry.name.endsWith(".ts") && !entry.name.endsWith(".test.ts")) {
      files.push(path);
    }
  }
  return files;
}

describe("core depends on no concrete generator", () => {
  verifies(ArchTraceables.ARCH_003_GENERATOR_INTERFACE, () => {
    test("no core source imports a concrete generator package", async () => {
      const sources = await collectSourceFiles(import.meta.dirname);
      const forbidden = "@ariadne-thread/gen-";

      const offenders: string[] = [];
      for (const source of sources) {
        const contents = await readFile(source, "utf8");
        if (contents.includes(forbidden)) {
          offenders.push(source);
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});
