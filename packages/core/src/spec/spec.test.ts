import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { Generator, SpecSet } from "../index.js";
import { ErrorCode, GENERATED_MARKER, spec } from "../index.js";

type Fixture = {
  configFile: string;
  outputDir: string;
  derivedDir: string;
};

// Lays out a spec tree, a config pointing `layout` at it and listing
// `generators`, and an output directory for the generated files. Extra config
// (such as `specSets` or `ignore`) can be merged in.
async function fixture(
  idFilenames: string[],
  generators: string[],
  extraConfig: Record<string, unknown> = {},
): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-spec-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  for (const name of idFilenames) {
    const target = name.startsWith("STR-") ? storiesDir : derivedDir;
    // Specs default to `active` so they are generated; the status filter (SW-014)
    // drops only `planned` specs, which individual tests write explicitly.
    await writeFile(join(target, name), "**Status**: active\n", "utf8");
  }
  const configFile = join(dir, ".ariadnerc.json");
  await writeFile(
    configFile,
    JSON.stringify({
      layout: {
        stories: { dir: storiesDir, prefix: "STR" },
        derivedSpecs: { dir: derivedDir },
      },
      generators,
      ...extraConfig,
    }),
    "utf8",
  );
  return { configFile, outputDir: join(dir, "out"), derivedDir };
}

// A generator that records the spec sets it was handed and emits one file whose
// content is derived from them, so re-running on unchanged specs is byte-stable.
function recordingGenerator(name: string): {
  generator: Generator;
  received: () => SpecSet[] | undefined;
} {
  let received: SpecSet[] | undefined;
  const generator: Generator = {
    name,
    defaultOutputDir: ".",
    sourceExtensions: [],
    discover: () => [],
    readTraceables: () => [],
    generate(specSets) {
      received = specSets.map((specSet) => ({
        name: specSet.name,
        specs: specSet.specs.map((traceable) => ({ ...traceable })),
      }));
      const body = specSets
        .map(
          (specSet) =>
            `${specSet.name}: ${specSet.specs.map((t) => t.id).join(",")}`,
        )
        .join("\n");
      return Promise.resolve([{ path: `${name}.txt`, contents: body }]);
    },
  };
  return { generator, received: () => received };
}

describe("spec generation", () => {
  verifies(SwTraceables.SW_014_GENERATE_TRACEABLES, () => {
    test("drives the configured generator with the scanned traceables grouped into spec sets", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md", "SW-013-b.md", "CON-012-c.md"],
        ["fake"],
      );
      const { generator, received } = recordingGenerator("fake");

      const result = await spec({
        configFile,
        outputDir,
        resolveGenerator: (name) => (name === "fake" ? generator : undefined),
      });

      expect(received()).toEqual([
        {
          name: "CON",
          specs: [
            {
              id: "CON-012",
              lens: "CON",
              filename: "CON-012-c.md",
              status: "active",
            },
          ],
        },
        {
          name: "SW",
          specs: [
            {
              id: "SW-012",
              lens: "SW",
              filename: "SW-012-a.md",
              status: "active",
            },
            {
              id: "SW-013",
              lens: "SW",
              filename: "SW-013-b.md",
              status: "active",
            },
          ],
        },
      ]);
      expect(result.traceableCount).toBe(3);
      expect(result.specSetCount).toBe(2);
      expect(result.generators).toEqual([
        { name: "fake", outputDir: ".", files: ["fake.txt"] },
      ]);
    });

    test("rejects a generator that returns a non-flat output path", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md"],
        ["escaper"],
      );
      const escaper: Generator = {
        name: "escaper",
        defaultOutputDir: ".",
        sourceExtensions: [],
        discover: () => [],
        readTraceables: () => [],
        generate: () =>
          Promise.resolve([
            { path: "../escape.ts", contents: GENERATED_MARKER },
          ]),
      };

      await expect(
        spec({
          configFile,
          outputDir,
          resolveGenerator: (name) =>
            name === "escaper" ? escaper : undefined,
        }),
      ).rejects.toThrow(/flat filename/i);
    });

    test("filters by status: a planned spec is not generated; active and deprecated are", async () => {
      const { configFile, outputDir, derivedDir } = await fixture([], ["fake"]);
      await writeFile(
        join(derivedDir, "SW-001-a.md"),
        "**Status**: active\n",
        "utf8",
      );
      await writeFile(
        join(derivedDir, "SW-002-b.md"),
        "**Status**: planned\n",
        "utf8",
      );
      await writeFile(
        join(derivedDir, "SW-003-c.md"),
        "**Status**: deprecated\n",
        "utf8",
      );
      const { generator, received } = recordingGenerator("fake");

      const result = await spec({
        configFile,
        outputDir,
        resolveGenerator: () => generator,
      });

      // The planned spec is filtered out; active and deprecated become traceables.
      expect(result.traceableCount).toBe(2);
      expect(received()?.flatMap((set) => set.specs.map((t) => t.id))).toEqual([
        "SW-001",
        "SW-003",
      ]);
    });

    test("writes each generated file under the output root", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md"],
        ["fake"],
      );
      const { generator } = recordingGenerator("fake");

      await spec({
        configFile,
        outputDir,
        resolveGenerator: () => generator,
      });

      const written = await readFile(join(outputDir, "fake.txt"), "utf8");
      expect(written).toBe("SW: SW-012");
    });

    test("re-running on unchanged specs produces byte-identical output", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md", "SW-013-b.md"],
        ["fake"],
      );
      const { generator } = recordingGenerator("fake");
      const run = (): Promise<unknown> =>
        spec({ configFile, outputDir, resolveGenerator: () => generator });

      await run();
      const first = await readFile(join(outputDir, "fake.txt"), "utf8");
      await run();
      const second = await readFile(join(outputDir, "fake.txt"), "utf8");

      expect(second).toBe(first);
    });

    test("invokes every configured generator, in configured order", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md"],
        ["one", "two"],
      );
      const one = recordingGenerator("one");
      const two = recordingGenerator("two");
      const registry = new Map([
        ["one", one.generator],
        ["two", two.generator],
      ]);

      const result = await spec({
        configFile,
        outputDir,
        resolveGenerator: (name) => registry.get(name),
      });

      expect(result.generators.map((report) => report.name)).toEqual([
        "one",
        "two",
      ]);
      expect(one.received()).toBeDefined();
      expect(two.received()).toBeDefined();
    });

    test("fails with E_UNKNOWN_GENERATOR when a configured generator is not registered", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md"],
        ["ghost"],
      );

      await expect(
        spec({ configFile, outputDir, resolveGenerator: () => undefined }),
      ).rejects.toMatchObject({ code: ErrorCode.UNKNOWN_GENERATOR });
    });
  });
});

describe("configured spec sets", () => {
  verifies(
    [
      SwTraceables.SW_015_GROUP_TRACEABLES,
      ConTraceables.CON_013_SPEC_SET_PARTITION,
    ],
    () => {
      test("groups by the configured specSets instead of by lens", async () => {
        const { configFile, outputDir } = await fixture(
          ["SW-012-command.md", "SW-013-scan.md", "CON-012-owned.md"],
          ["fake"],
          {
            specSets: [
              { name: "commands", pattern: "command" },
              { name: "rest", catchAll: true },
            ],
          },
        );
        const { generator, received } = recordingGenerator("fake");

        await spec({
          configFile,
          outputDir,
          resolveGenerator: () => generator,
        });

        expect(received()?.map((specSet) => specSet.name)).toEqual([
          "commands",
          "rest",
        ]);
      });

      test("an ignore pattern excludes matching specs from generation", async () => {
        const { configFile, outputDir } = await fixture(
          ["SW-012-a.md", "SW-013-draft.md"],
          ["fake"],
          { ignore: ["draft"] },
        );
        const { generator, received } = recordingGenerator("fake");

        const result = await spec({
          configFile,
          outputDir,
          resolveGenerator: () => generator,
        });

        expect(result.traceableCount).toBe(2);
        expect(received()).toEqual([
          {
            name: "SW",
            specs: [
              {
                id: "SW-012",
                lens: "SW",
                filename: "SW-012-a.md",
                status: "active",
              },
            ],
          },
        ]);
      });

      test("surfaces an unmatched traceable as E_SPEC_SET_UNMATCHED", async () => {
        const { configFile, outputDir } = await fixture(
          ["SW-012-a.md", "CON-012-b.md"],
          ["fake"],
          { specSets: [{ name: "sw", pattern: "^SW-" }] },
        );
        const { generator } = recordingGenerator("fake");

        await expect(
          spec({ configFile, outputDir, resolveGenerator: () => generator }),
        ).rejects.toMatchObject({ code: ErrorCode.SPEC_SET_UNMATCHED });
      });
    },
  );
});

describe("pruning stale output", () => {
  verifies(ConTraceables.CON_012_GENERATED_FILES_TOOL_OWNED, () => {
    test("removes a previously-generated file that is no longer emitted, keeping non-generated files", async () => {
      const { configFile, outputDir } = await fixture(
        ["SW-012-a.md"],
        ["fake"],
      );
      const { generator } = recordingGenerator("fake");
      // The fake writes to the project root (defaultOutputDir "."); seed that dir.
      await mkdir(outputDir, { recursive: true });
      const stale = join(outputDir, "StaleTraceables.ts");
      const handwritten = join(outputDir, "keep.ts");
      await writeFile(
        stale,
        `/*\n * THIS FILE IS ${GENERATED_MARKER} - DO NOT EDIT MANUALLY\n */\nexport enum Stale {}\n`,
        "utf8",
      );
      await writeFile(handwritten, "export const x = 1;\n", "utf8");

      await spec({ configFile, outputDir, resolveGenerator: () => generator });

      // The stale generated file is pruned; the hand-written file and the emitted file remain.
      await expect(readFile(stale, "utf8")).rejects.toThrow();
      expect(await readFile(handwritten, "utf8")).toContain("const x");
      expect(await readFile(join(outputDir, "fake.txt"), "utf8")).toBe(
        "SW: SW-012",
      );
    });
  });
});
