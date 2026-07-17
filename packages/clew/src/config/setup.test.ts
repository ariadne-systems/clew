import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import type { HarnessAdapter, MethodMaterials } from "../harness/harness.js";
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

    test("re-running with --generator fills an empty generators, touching nothing else", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await setup({ configFile });
      const before = JSON.parse(await readFile(configFile, "utf8")) as Record<
        string,
        unknown
      >;

      const result = await setup({ configFile, generator: "typescript" });

      expect(result.created).toBe(false);
      expect(result.generator).toBe("typescript");
      const after = JSON.parse(await readFile(configFile, "utf8")) as Record<
        string,
        unknown
      >;
      expect(after.generators).toEqual([{ type: "typescript" }]);
      expect({ ...after, generators: [] }).toEqual({
        ...before,
        generators: [],
      });
    });

    test("re-running with --generator never replaces an already-configured generator", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await setup({ configFile, generator: "typescript" });
      const before = await readFile(configFile, "utf8");

      const result = await setup({ configFile, generator: "typescript" });

      expect(result.created).toBe(false);
      expect(result.generator).toBeNull();
      expect(await readFile(configFile, "utf8")).toBe(before);
    });
  });
});

describe("setup seeds the architecture overview", () => {
  verifies(SwTraceables.SW_046_SETUP_SEEDS_ARCHITECTURE_OVERVIEW, () => {
    test("seeds a marked architecture skeleton in the docs tree", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile });

      const doc = await readFile(
        join(dir, "docs", "spec", "architecture.md"),
        "utf8",
      );
      expect(doc).toContain("# Architecture");
      expect(doc).toContain("ARCH and CON specs");
    });

    test("never overwrites an existing architecture overview", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      const docPath = join(dir, "docs", "spec", "architecture.md");
      await setup({ configFile });
      await writeFile(docPath, "my architecture\n", "utf8");

      await setup({ configFile });

      expect(await readFile(docPath, "utf8")).toBe("my architecture\n");
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

describe("setup emits the agent-facing method", () => {
  verifies(
    [
      SwTraceables.SW_043_SETUP_EMITS_METHOD_SCAFFOLD,
      SwTraceables.SW_044_SETUP_SEEDS_PROJECT_STUBS,
    ],
    () => {
      test("emits the governance and skills and records the agent", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");

        const result = await setup({ configFile });

        expect(result.agent).toBe("claude");
        expect(
          existsSync(
            join(dir, ".claude/.ai-project-context/000-agent-instructions.md"),
          ),
        ).toBe(true);
        expect(
          existsSync(join(dir, ".claude/skills/clew-setup/SKILL.md")),
        ).toBe(true);
        const config = JSON.parse(await readFile(configFile, "utf8")) as {
          agent: string;
        };
        expect(config.agent).toBe("claude");
      });

      test("seeds the project stubs as skeletons", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");

        await setup({ configFile });

        const stub = await readFile(
          join(dir, ".claude/.ai-project-context/004-technology-contract.md"),
          "utf8",
        );
        expect(stub).toContain("PROJECT STUB");
      });

      test("rejects an unknown agent before writing anything", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");

        await expect(setup({ configFile, agent: "emacs" })).rejects.toThrow(
          /emacs/,
        );

        expect(existsSync(configFile)).toBe(false);
      });

      test("re-running preserves a hand-edited method file and leaves the config unchanged", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");
        await setup({ configFile });
        const before = await readFile(configFile, "utf8");
        const baseline = join(
          dir,
          ".claude/.ai-project-context/000-agent-instructions.md",
        );
        await writeFile(baseline, "hand edit\n", "utf8");

        const result = await setup({ configFile });

        expect(result.created).toBe(false);
        expect(await readFile(configFile, "utf8")).toBe(before);
        expect(await readFile(baseline, "utf8")).toContain("hand edit");
        expect(result.methodPreserved).toContain(
          ".claude/.ai-project-context/000-agent-instructions.md",
        );
      });

      test("a re-run preserves an edited method file and does not re-seed a deleted stub", async () => {
        const dir = await tempDir();
        const configFile = join(dir, ".clewrc.json");
        await setup({ configFile });
        const stubPath = join(
          dir,
          ".claude/.ai-project-context/004-technology-contract.md",
        );
        await rm(stubPath);
        const baseline = join(
          dir,
          ".claude/.ai-project-context/000-agent-instructions.md",
        );
        await writeFile(baseline, "hand edit\n", "utf8");

        const result = await setup({ configFile });

        expect(result.created).toBe(false);
        expect(existsSync(stubPath)).toBe(false);
        expect(await readFile(baseline, "utf8")).toContain("hand edit");
      });
    },
  );
});

describe("setup emits through the harness-adapter interface", () => {
  verifies(ArchTraceables.ARCH_008_METHOD_BEHIND_HARNESS_ADAPTER, () => {
    test("drives the injected adapter with the materials, and the adapter is the sole writer of harness output", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      const received: MethodMaterials[] = [];
      const fake: HarnessAdapter = {
        name: "fake",
        async emit(materials: MethodMaterials) {
          received.push(materials);
          return { written: ["fake/marker.md"], seeded: [], preserved: [] };
        },
      };

      const result = await setup({
        configFile,
        agent: "fake",
        resolveHarness: (name) => (name === "fake" ? fake : undefined),
      });

      expect(result.agent).toBe("fake");
      expect(received).toHaveLength(1);
      expect(received[0]?.baselines.length).toBeGreaterThan(0);
      expect(received[0]?.skills.length).toBeGreaterThan(0);
      expect(existsSync(join(dir, ".claude"))).toBe(false);
    });
  });
});

describe("setup seeds the ADR practice", () => {
  verifies(SwTraceables.SW_045_SETUP_SEEDS_ADR_PRACTICE, () => {
    test("writes a tool-owned ADR template under docs/adr", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");

      await setup({ configFile });

      const template = await readFile(
        join(dir, "docs/adr/ADR-template.md"),
        "utf8",
      );
      expect(template).toContain("GENERATED BY CLEW");
      expect(template).toContain("ADR-NNNN");
    });

    test("re-emits the template but never overwrites a project's own ADR", async () => {
      const dir = await tempDir();
      const configFile = join(dir, ".clewrc.json");
      await setup({ configFile });
      const mine = join(dir, "docs/adr/ADR-0001-mine.md");
      await writeFile(mine, "my decision\n", "utf8");

      await setup({ configFile });

      expect(await readFile(mine, "utf8")).toBe("my decision\n");
    });
  });
});
