import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArchTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";

// Collects the engine's production sources (every `.ts` under src, excluding test
// files), so the boundary check below reads exactly what ships.
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
    // ADR-0007: the concrete generators live in-tree, bound at a single registry
    // point (src/generators/registry.ts). Every engine and CLI module reaches a
    // generator through the `Generator` interface; nothing outside the generators
    // directory names a concrete generator factory, so the concrete set is bound
    // in exactly one place and never leaks into the generation-agnostic core.
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
  // ADR-0007: the CLI (src/cli) is the presentation layer; the engine is free of
  // presentation concerns, so nothing outside src/cli reads or writes the process
  // (stdout / stderr / exit / argv) or parses arguments (commander). The property
  // holds in fact; this guards it from silently regressing.
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
