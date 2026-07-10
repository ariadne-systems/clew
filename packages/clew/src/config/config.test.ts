import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { Generator } from "../index.js";
import {
  DEFAULT_LENSES,
  ErrorCode,
  readConfiguredPrefixes,
  readGenerators,
  readIdGenerationConfig,
  readIgnore,
  readLayout,
  readLenses,
  readSpecSets,
  requireConfig,
  resolveConfiguration,
} from "../index.js";

/** A generator stub whose only relevant behaviour is the directory it defaults to. */
function fakeGenerator(name: string, defaultOutputDir: string): Generator {
  return {
    name,
    defaultOutputDir,
    sourceExtensions: [],
    findComments: () => [],
    discover: () => [],
    readTraceables: () => [],
    generate: async () => [],
  };
}

async function tempConfigFile(contents: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-config-"));
  const file = join(dir, ".clewrc.json");
  await writeFile(file, JSON.stringify(contents), "utf8");
  return file;
}

async function missingConfigFile(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-config-"));
  return join(dir, ".clewrc.json");
}

describe("readIdGenerationConfig", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
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
});

describe("readLenses", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
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
});

describe("readLayout", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
    test("reads configured layout values and defaults the rest", async () => {
      const file = await tempConfigFile({
        layout: { stories: { dir: "specs/stories", prefix: "EPIC" } },
      });

      const layout = await readLayout(file);

      expect(layout.stories).toEqual({ dir: "specs/stories", prefix: "EPIC" });
      expect(layout.derivedSpecs.dir).toBe("docs/spec/derived-specs");
    });

    test("defaults the whole layout when unconfigured", async () => {
      const layout = await readLayout(await missingConfigFile());

      expect(layout.stories).toEqual({
        dir: "docs/spec/stories",
        prefix: "STR",
      });
      expect(layout.state.file).toBe(".clew/state.json");
    });
  });
});

describe("readConfiguredPrefixes", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
    test("combines the lens ids with the story prefix", async () => {
      const file = await tempConfigFile({
        lenses: [{ id: "SW", description: "Software spec." }],
        layout: {
          stories: { dir: "x", prefix: "EPIC" },
        },
      });

      const prefixes = await readConfiguredPrefixes(file);

      expect([...prefixes].sort()).toEqual(["EPIC", "SW"]);
    });

    test("defaults to the default lenses plus the STR prefix", async () => {
      const prefixes = await readConfiguredPrefixes(await missingConfigFile());

      expect(prefixes.has("SW")).toBe(true);
      expect(prefixes.has("STR")).toBe(true);
      expect(prefixes.has("HW")).toBe(false);
    });
  });
});

describe("readSpecSets", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
    test("reads the configured spec sets in order, with patterns and catch-all", async () => {
      const file = await tempConfigFile({
        specSets: [
          { name: "security", pattern: "secur" },
          { name: "rest", catchAll: true },
        ],
      });

      const specSets = await readSpecSets(file);

      expect(specSets).toEqual([
        { name: "security", pattern: "secur" },
        { name: "rest", catchAll: true },
      ]);
    });

    test("returns an empty list when no specSets are configured", async () => {
      expect(await readSpecSets(await missingConfigFile())).toEqual([]);
    });
  });
});

describe("readGenerators", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
    test("reads each generator's type and output directory", async () => {
      const file = await tempConfigFile({
        generators: [
          { type: "typescript", outputDir: "src/ts" },
          { type: "java", outputDir: "src/main/java" },
        ],
      });

      expect(await readGenerators(file)).toEqual([
        { type: "typescript", outputDir: "src/ts" },
        { type: "java", outputDir: "src/main/java" },
      ]);
    });

    test("normalizes a bare type string to a generator with no output directory", async () => {
      const file = await tempConfigFile({ generators: ["typescript"] });

      expect(await readGenerators(file)).toEqual([{ type: "typescript" }]);
    });

    test("treats an empty outputDir as unset so the generator default applies", async () => {
      const file = await tempConfigFile({
        generators: [{ type: "typescript", outputDir: "" }],
      });

      expect(await readGenerators(file)).toEqual([{ type: "typescript" }]);
    });

    test("returns an empty list when none are configured", async () => {
      expect(await readGenerators(await missingConfigFile())).toEqual([]);
    });
  });
});

describe("readIgnore", () => {
  verifies(SwTraceables.SW_009_READ_CONFIGURATION, () => {
    test("reads the configured ignore patterns", async () => {
      const file = await tempConfigFile({ ignore: ["draft", "scratch"] });

      expect(await readIgnore(file)).toEqual(["draft", "scratch"]);
    });

    test("returns an empty list when no ignore patterns are configured", async () => {
      expect(await readIgnore(await missingConfigFile())).toEqual([]);
    });
  });
});

describe("requireConfig", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("throws E_NO_CONFIG and points to setup when no configuration exists", async () => {
      await expect(
        requireConfig(await missingConfigFile()),
      ).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
        message: expect.stringMatching(/setup/i),
      });
    });

    test("resolves when a configuration exists", async () => {
      const file = await tempConfigFile({ version: 1 });

      await expect(requireConfig(file)).resolves.toBeUndefined();
    });
  });
});

describe("resolveConfiguration", () => {
  verifies(
    [
      SwTraceables.SW_019_RESOLVE_CONFIGURATION,
      SysTraceables.SYS_010_CONFIGURABLE_LENSES,
    ],
    () => {
      test("resolves the defaulted lenses, derived prefixes, and layout for an absent-section configuration", async () => {
        const file = await tempConfigFile({ version: 1 });

        const resolved = await resolveConfiguration({
          resolveGenerator: () => undefined,
          configFile: file,
        });

        expect(resolved.lenses).toEqual([...DEFAULT_LENSES]);
        expect(resolved.prefixes).toEqual(
          expect.arrayContaining(["SW", "CON", "STR"]),
        );
        expect(resolved.layout.stories.dir).toBe("docs/spec/stories");
        expect(resolved.generators).toEqual([]);
      });

      test("resolves a generator's output directory to its default when none is configured", async () => {
        const file = await tempConfigFile({ generators: [{ type: "ts" }] });

        const resolved = await resolveConfiguration({
          resolveGenerator: (name) =>
            name === "ts" ? fakeGenerator("ts", "gen/ts") : undefined,
          configFile: file,
        });

        expect(resolved.generators).toEqual([
          { type: "ts", outputDir: "gen/ts" },
        ]);
      });

      test("keeps a generator's configured output directory without consulting the generator", async () => {
        const file = await tempConfigFile({
          generators: [{ type: "ts", outputDir: "custom/out" }],
        });

        const resolved = await resolveConfiguration({
          resolveGenerator: () => undefined,
          configFile: file,
        });

        expect(resolved.generators).toEqual([
          { type: "ts", outputDir: "custom/out" },
        ]);
      });

      test("fails with E_UNKNOWN_GENERATOR when a generator needs its default but is not registered", async () => {
        const file = await tempConfigFile({ generators: [{ type: "ghost" }] });
        const resolveGenerator = () => undefined;

        await expect(
          resolveConfiguration({ resolveGenerator, configFile: file }),
        ).rejects.toMatchObject({ code: ErrorCode.UNKNOWN_GENERATOR });
      });
    },
  );
});
