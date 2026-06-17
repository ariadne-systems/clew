import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import {
  DEFAULT_LENSES,
  readConfiguredPrefixes,
  readIdGenerationConfig,
  readLayout,
  readLenses,
} from "./index.js";

async function tempConfigFile(contents: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-config-"));
  const file = join(dir, ".ariadnerc.json");
  await writeFile(file, JSON.stringify(contents), "utf8");
  return file;
}

async function missingConfigFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-config-"));
  return join(dir, ".ariadnerc.json");
}

describe("readIdGenerationConfig", () => {
  test("reads mode and padding from the idGeneration section", async () => {
    const file = await tempConfigFile({
      idGeneration: { mode: "sequential", padding: 4 },
    });

    const config = await readIdGenerationConfig(file);

    expect(config).toEqual({ mode: "sequential", padding: 4 });
  });

  test("recognises opaque mode", async () => {
    const file = await tempConfigFile({ idGeneration: { mode: "opaque" } });

    const config = await readIdGenerationConfig(file);

    expect(config.mode).toBe("opaque");
  });

  test("defaults to sequential mode and padding 3 when the section is absent", async () => {
    const file = await tempConfigFile({ version: 1 });

    const config = await readIdGenerationConfig(file);

    expect(config).toEqual({ mode: "sequential", padding: 3 });
  });

  test("defaults a missing configuration file to sequential mode and padding 3", async () => {
    const config = await readIdGenerationConfig(await missingConfigFile());

    expect(config).toEqual({ mode: "sequential", padding: 3 });
  });
});

describe("readLenses", () => {
  test("reads the configured lenses in order", async () => {
    const file = await tempConfigFile({
      lenses: [
        { id: "RISK", description: "A risk spec." },
        { id: "SEC", description: "A security spec." },
      ],
    });

    const lenses = await readLenses(file);

    expect(lenses.map((lens) => lens.id)).toEqual(["RISK", "SEC"]);
  });

  test("falls back to the default lens set when none is configured", async () => {
    const lenses = await readLenses(await missingConfigFile());

    expect(lenses).toEqual([...DEFAULT_LENSES]);
  });

  test("falls back to the default lens set when the section is empty", async () => {
    const file = await tempConfigFile({ lenses: [] });

    const lenses = await readLenses(file);

    expect(lenses).toEqual([...DEFAULT_LENSES]);
  });
});

describe("readLayout", () => {
  test("reads configured layout values and defaults the rest", async () => {
    const file = await tempConfigFile({
      layout: { stories: { dir: "specs/stories", prefix: "EPIC" } },
    });

    const layout = await readLayout(file);

    expect(layout.stories).toEqual({ dir: "specs/stories", prefix: "EPIC" });
    expect(layout.derivedSpecs.dir).toBe("docs/spec/derived-specs");
    expect(layout.entities.prefix).toBe("ENT");
  });

  test("defaults the whole layout when unconfigured", async () => {
    const layout = await readLayout(await missingConfigFile());

    expect(layout.stories).toEqual({ dir: "docs/spec/stories", prefix: "STR" });
    expect(layout.state.file).toBe(".ariadne/state.json");
  });
});

describe("readConfiguredPrefixes", () => {
  test("combines the lens ids with the story and entity prefixes", async () => {
    const file = await tempConfigFile({
      lenses: [{ id: "SW", description: "Software spec." }],
      layout: {
        stories: { dir: "x", prefix: "EPIC" },
        entities: { file: "y", prefix: "DOM" },
      },
    });

    const prefixes = await readConfiguredPrefixes(file);

    expect([...prefixes].sort()).toEqual(["DOM", "EPIC", "SW"]);
  });

  test("defaults to the default lenses plus the STR and ENT prefixes", async () => {
    const prefixes = await readConfiguredPrefixes(await missingConfigFile());

    expect(prefixes.has("SW")).toBe(true);
    expect(prefixes.has("STR")).toBe(true);
    expect(prefixes.has("ENT")).toBe(true);
    expect(prefixes.has("HW")).toBe(false);
  });
});
