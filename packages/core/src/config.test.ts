import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { readIdGenerationConfig, readIdTokenPattern } from "./index.js";

async function tempConfigFile(contents: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-config-"));
  const file = join(dir, ".ariadnerc.json");
  await writeFile(file, JSON.stringify(contents), "utf8");
  return file;
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
    const dir = await mkdtemp(join(tmpdir(), "ariadne-config-"));

    const config = await readIdGenerationConfig(join(dir, ".ariadnerc.json"));

    expect(config).toEqual({ mode: "sequential", padding: 3 });
  });
});

describe("readIdTokenPattern", () => {
  test("reads the id token pattern from the idToken section", async () => {
    const file = await tempConfigFile({
      idToken: { pattern: "[A-Z]{2,4}-[0-9]{3}" },
    });

    const pattern = await readIdTokenPattern(file);

    expect(pattern).toBe("[A-Z]{2,4}-[0-9]{3}");
  });

  test("returns undefined when no id token pattern is configured", async () => {
    const file = await tempConfigFile({ version: 1 });

    const pattern = await readIdTokenPattern(file);

    expect(pattern).toBeUndefined();
  });
});
