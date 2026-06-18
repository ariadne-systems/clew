import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import type { Generator, SpecSet } from "./index.js";
import { ErrorCode, spec } from "./index.js";

type Fixture = {
  configFile: string;
  outputDir: string;
};

// Lays out a spec tree, a config pointing `layout` at it and listing
// `generators`, and an output directory for the generated files.
async function fixture(
  idFilenames: string[],
  generators: string[],
): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-spec-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  for (const name of idFilenames) {
    const target = name.startsWith("STR-") ? storiesDir : derivedDir;
    await writeFile(join(target, name), "x", "utf8");
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
    }),
    "utf8",
  );
  return { configFile, outputDir: join(dir, "out") };
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
    generate(specSets) {
      received = specSets.map((specSet) => ({
        name: specSet.name,
        traceables: specSet.traceables.map((traceable) => ({ ...traceable })),
      }));
      const body = specSets
        .map(
          (specSet) =>
            `${specSet.name}: ${specSet.traceables.map((t) => t.id).join(",")}`,
        )
        .join("\n");
      return Promise.resolve([{ path: `${name}.txt`, contents: body }]);
    },
  };
  return { generator, received: () => received };
}

describe("spec generation", () => {
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
        traceables: [{ id: "CON-012", lens: "CON", filename: "CON-012-c.md" }],
      },
      {
        name: "SW",
        traceables: [
          { id: "SW-012", lens: "SW", filename: "SW-012-a.md" },
          { id: "SW-013", lens: "SW", filename: "SW-013-b.md" },
        ],
      },
    ]);
    expect(result.traceableCount).toBe(3);
    expect(result.specSetCount).toBe(2);
    expect(result.generators).toEqual([{ name: "fake", files: ["fake.txt"] }]);
  });

  test("writes each generated file under the output root", async () => {
    const { configFile, outputDir } = await fixture(["SW-012-a.md"], ["fake"]);
    const { generator } = recordingGenerator("fake");

    await spec({
      configFile,
      outputDir,
      resolveGenerator: () => generator,
    });

    const written = await readFile(join(outputDir, "fake.txt"), "utf8");
    expect(written).toBe("SW: SW-012");
  });

  test("re-running on unchanged specs produces byte-identical output (CON-012)", async () => {
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
    const { configFile, outputDir } = await fixture(["SW-012-a.md"], ["ghost"]);

    await expect(
      spec({ configFile, outputDir, resolveGenerator: () => undefined }),
    ).rejects.toMatchObject({ code: ErrorCode.UNKNOWN_GENERATOR });
  });
});
