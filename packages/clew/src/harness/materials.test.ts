import { readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";
import { loadAdrTemplate, loadMethodMaterials } from "./materials.js";

const repoRoot = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);
const claudeGovernance = join(repoRoot, ".claude", ".ai-project-context");
const claudeSkills = join(repoRoot, ".claude", "skills");
const templates = join(repoRoot, "packages", "clew", "templates");
const BASELINES = [
  "000-agent-instructions.md",
  "001-charta.md",
  "002-architecture.md",
  "003-developer-guidelines.md",
  "006-spec-conventions.md",
];

describe("loading the method materials", () => {
  test("loads the baselines, skills, and stubs from the templates", async () => {
    const materials = await loadMethodMaterials();

    expect(materials.baselines.map((file) => file.name)).toContain(
      "000-agent-instructions.md",
    );
    expect(materials.skills.map((file) => file.name)).toContain("clew-setup");
    expect(materials.stubs.map((file) => file.name)).toContain(
      "004-technology-contract.md",
    );
    expect(materials.baselines.every((file) => file.contents.length > 0)).toBe(
      true,
    );
  });

  test("loads the ADR template", async () => {
    expect(await loadAdrTemplate()).toContain("ADR-NNNN");
  });

  test("strips clew's copyright from every emitted method body", async () => {
    const materials = await loadMethodMaterials();
    const bodies = [
      ...materials.baselines,
      ...materials.skills,
      ...materials.stubs,
    ].map((file) => file.contents);

    expect(bodies.some((body) => /copyright/i.test(body))).toBe(false);
    expect(/copyright/i.test(await loadAdrTemplate())).toBe(false);
  });
});

describe("the shipped templates stay in sync with clew's own governance", () => {
  const stale = "run scripts/sync-method-templates.mjs";

  test("the shipped baselines are exactly the expected set, each matching .claude", async () => {
    const shipped = (await readdir(join(templates, "baselines")))
      .filter((name) => name.endsWith(".md"))
      .sort();
    expect(shipped, stale).toEqual([...BASELINES].sort());
    for (const name of BASELINES) {
      expect(
        await readFile(join(templates, "baselines", name), "utf8"),
        `templates/baselines/${name} is stale — ${stale}`,
      ).toBe(await readFile(join(claudeGovernance, name), "utf8"));
    }
  });

  test("the shipped skills mirror .claude/skills exactly (no missing, no stale)", async () => {
    const dirNames = async (dir: string): Promise<string[]> =>
      (await readdir(dir, { withFileTypes: true }))
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
    const source = await dirNames(claudeSkills);
    expect(await dirNames(join(templates, "skills")), stale).toEqual(source);
    for (const name of source) {
      expect(
        await readFile(join(templates, "skills", name, "SKILL.md"), "utf8"),
        `templates/skills/${name} is stale — ${stale}`,
      ).toBe(await readFile(join(claudeSkills, name, "SKILL.md"), "utf8"));
    }
  });
});
