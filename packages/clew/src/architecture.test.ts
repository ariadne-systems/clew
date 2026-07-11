import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArchTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";

// Every production `.ts` under src, excluding test files.
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

describe("generators are reached only through the interface", () => {
  verifies(ArchTraceables.ARCH_003_GENERATOR_INTERFACE, () => {
    // The closed set of concrete generator factory names that no module outside
    // src/generators may reference.
    test("no module outside src/generators names a concrete generator", async () => {
      const srcRoot = import.meta.dirname;
      const generatorsDir = join(srcRoot, "generators");
      const sources = await collectSourceFiles(srcRoot);
      const concreteFactories = [
        "createTypeScriptGenerator",
        "createJavaGenerator",
      ];

      const offenders: string[] = [];
      for (const source of sources) {
        if (source.startsWith(generatorsDir)) {
          continue;
        }
        const contents = await readFile(source, "utf8");
        if (concreteFactories.some((factory) => contents.includes(factory))) {
          offenders.push(source);
        }
      }

      expect(offenders).toEqual([]);
    });
  });
});

describe("only the CLI layer touches the process and argument parsing", () => {
  // Presentation tokens only src/cli may reference: the process (stdout/stderr/
  // exit/argv) and commander argument parsing.
  test("no module outside src/cli references process or commander", async () => {
    const srcRoot = import.meta.dirname;
    const cliDir = join(srcRoot, "cli");
    const sources = await collectSourceFiles(srcRoot);
    const presentationTokens = ["process.", "commander"];

    const offenders: string[] = [];
    for (const source of sources) {
      if (source.startsWith(cliDir)) {
        continue;
      }
      const contents = await readFile(source, "utf8");
      if (presentationTokens.some((token) => contents.includes(token))) {
        offenders.push(source);
      }
    }

    expect(offenders).toEqual([]);
  });
});
