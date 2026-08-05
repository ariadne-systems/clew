import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ArchTraceables, SysTraceables, verifies } from "@ariadne-thread/trace";
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
  verifies(
    [
      ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
      SysTraceables.SYS_008_LANGUAGE_NEUTRAL_EXTENSIBILITY,
    ],
    () => {
      // The closed set of concrete generator factory names that no module outside
      // src/generators may reference. The same single-registry-point boundary is
      // what keeps the core language-neutral: name a concrete generator outside
      // src/generators and both the generator interface and the language-
      // extensibility seam it provides are broken, so this test falsifies each.
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
    },
  );
});

describe("agents are named only at the presets registry", () => {
  verifies(ArchTraceables.ARCH_008_METHOD_BEHIND_HARNESS_ADAPTER, () => {
    // The known agents' locations live as data at a single registry
    // (harness/presets.ts). Every other module resolves a placement uniformly and
    // names no target agent; the emitter branches on none.
    test("no production source outside the presets registry names a non-default agent", async () => {
      const srcRoot = import.meta.dirname;
      const presetsFile = join(srcRoot, "harness", "presets.ts");
      const sources = await collectSourceFiles(srcRoot);
      const foreignAgentLiterals = [
        "GEMINI.md",
        ".cursor/skills",
        ".gemini/skills",
        ".github/skills",
        ".agents/skills",
      ];

      const offenders: string[] = [];
      for (const source of sources) {
        if (source === presetsFile) {
          continue;
        }
        const contents = await readFile(source, "utf8");
        if (
          foreignAgentLiterals.some((literal) => contents.includes(literal))
        ) {
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
