import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
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

describe("setup selects the generator", () => {
  verifies(SwTraceables.SW_039_SETUP_SELECTS_GENERATOR, () => {
    test("writes the chosen generator into the configuration", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile, generator: "typescript" });

      const config = JSON.parse(await readFile(configFile, "utf8")) as {
        generators: { type: string }[];
      };
      expect(config.generators).toEqual([{ type: "typescript" }]);
    });

    test("with no generator, writes an empty generators section", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      const result = await setup({ configFile });

      const config = JSON.parse(await readFile(configFile, "utf8")) as {
        generators: unknown[];
      };
      expect(config.generators).toEqual([]);
      expect(result.generator).toBeNull();
    });

    test("rejects an unknown generator before writing anything", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await expect(setup({ configFile, generator: "cobol" })).rejects.toThrow(
        /cobol/,
      );

      expect(existsSync(configFile)).toBe(false);
      expect(existsSync(join(dir, "docs", "spec", "stories"))).toBe(false);
    });

    test("rejects an unknown generator even when a configuration exists", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await writeFile(configFile, '{"custom":true}', "utf8");

      await expect(setup({ configFile, generator: "cobol" })).rejects.toThrow(
        /cobol/,
      );

      expect(await readFile(configFile, "utf8")).toBe('{"custom":true}');
    });
  });
});

describe("setup scaffolds the document schemas", () => {
  verifies(SwTraceables.SW_040_SETUP_SCAFFOLDS_SCHEMAS, () => {
    test("writes the default schema files and wires the schemas section", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile });

      expect(
        existsSync(join(dir, "docs", "spec", "schemas", "story.schema.yaml")),
      ).toBe(true);
      expect(
        existsSync(join(dir, "docs", "spec", "schemas", "spec.schema.yaml")),
      ).toBe(true);
      const config = JSON.parse(await readFile(configFile, "utf8")) as {
        schemas: { story: string; spec: string };
      };
      expect(config.schemas).toEqual({
        story: "docs/spec/schemas/story.schema.yaml",
        spec: "docs/spec/schemas/spec.schema.yaml",
      });
    });

    test("does not overwrite an existing schema file", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      const storySchema = join(
        dir,
        "docs",
        "spec",
        "schemas",
        "story.schema.yaml",
      );
      await mkdir(join(dir, "docs", "spec", "schemas"), { recursive: true });
      await writeFile(storySchema, "custom: true\n", "utf8");

      const result = await setup({ configFile });

      expect(await readFile(storySchema, "utf8")).toBe("custom: true\n");
      expect(result.schemas).not.toContain(
        "docs/spec/schemas/story.schema.yaml",
      );
      const config = JSON.parse(await readFile(configFile, "utf8")) as {
        schemas: { story: string };
      };
      expect(config.schemas.story).toBe("docs/spec/schemas/story.schema.yaml");
    });
  });
});

describe("setup ignores the tool's regenerated output", () => {
  verifies(SwTraceables.SW_041_SETUP_IGNORES_TOOL_OUTPUT, () => {
    test("creates a .gitignore with the tool-output entries, keeping state tracked", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile });

      const gitignore = await readFile(join(dir, ".gitignore"), "utf8");
      expect(gitignore).toContain(".clew/locations.json");
      expect(gitignore).toContain(".clew/coverage.json");
      expect(gitignore).not.toContain(".clew/state.json");
    });

    test("appends only the missing entries to an existing .gitignore", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await writeFile(
        join(dir, ".gitignore"),
        "node_modules\n.clew/locations.json\n",
        "utf8",
      );

      await setup({ configFile });

      const gitignore = await readFile(join(dir, ".gitignore"), "utf8");
      expect(gitignore.startsWith("node_modules\n.clew/locations.json\n")).toBe(
        true,
      );
      expect(gitignore.match(/\.clew\/locations\.json/g)).toHaveLength(1);
      expect(gitignore).toContain(".clew/coverage.json");
    });

    test("appends after a .gitignore that lacks a trailing newline", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await writeFile(join(dir, ".gitignore"), "node_modules", "utf8");

      await setup({ configFile });

      const gitignore = await readFile(join(dir, ".gitignore"), "utf8");
      expect(gitignore.startsWith("node_modules\n")).toBe(true);
      expect(gitignore).toContain(".clew/locations.json");
      expect(gitignore).toContain(".clew/coverage.json");
    });
  });
});

describe("setup waives the stakeholder lens", () => {
  verifies(SwTraceables.SW_042_SETUP_WAIVES_STAKEHOLDER_LENS, () => {
    test("writes a default STK-* coverage waiver", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile });

      const config = JSON.parse(await readFile(configFile, "utf8")) as {
        waivers: { pattern?: string; reason: string }[];
      };
      expect(config.waivers).toHaveLength(1);
      expect(config.waivers[0]?.pattern).toBe("STK-*");
      expect(config.waivers[0]?.reason).toBeTruthy();
    });
  });
});
