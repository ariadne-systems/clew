import { existsSync } from "node:fs";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ArchTraceables, ConTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { emitMaterials } from "./emit.js";
import type { MethodMaterials } from "./harness.js";
import { METHOD_MARKER } from "./harness.js";
import { DEFAULT_PLACEMENT } from "./placement.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "clew-harness-"));
}

const materials: MethodMaterials = {
  baselines: [
    { name: "000-agent-instructions.md", contents: "governance body\n" },
  ],
  skills: [{ name: "clew-setup", contents: "skill body\n" }],
  stubs: [{ name: "004-technology-contract.md", contents: "stub body\n" }],
};

const GOVERNANCE = DEFAULT_PLACEMENT.governanceDir;

describe("emitting the method into a placement", () => {
  verifies(
    [
      ArchTraceables.ARCH_008_METHOD_BEHIND_HARNESS_ADAPTER,
      ConTraceables.CON_033_METHOD_SCAFFOLD_TOOL_OWNED,
    ],
    () => {
      test("places baselines and skills as tool-owned marked files", async () => {
        const root = await tempDir();

        const result = await emitMaterials(DEFAULT_PLACEMENT, materials, root);

        const baseline = await readFile(
          join(root, GOVERNANCE, "000-agent-instructions.md"),
          "utf8",
        );
        expect(baseline).toContain(METHOD_MARKER);
        expect(baseline).toContain("governance body");
        const skill = await readFile(
          join(root, ".claude/skills/clew-setup/SKILL.md"),
          "utf8",
        );
        expect(skill).toContain(METHOD_MARKER);
        expect(skill).toContain("skill body");
        expect(result.written).toEqual([
          `${GOVERNANCE}/000-agent-instructions.md`,
          ".claude/skills/clew-setup/SKILL.md",
        ]);
      });

      test("preserves a hand edit on re-emit, and reports it preserved", async () => {
        const root = await tempDir();
        await emitMaterials(DEFAULT_PLACEMENT, materials, root);
        const path = join(root, GOVERNANCE, "000-agent-instructions.md");
        await writeFile(path, "hand edit\n", "utf8");

        const result = await emitMaterials(DEFAULT_PLACEMENT, materials, root);

        expect(await readFile(path, "utf8")).toContain("hand edit");
        expect(result.preserved).toContain(
          `${GOVERNANCE}/000-agent-instructions.md`,
        );
        expect(result.written).not.toContain(
          `${GOVERNANCE}/000-agent-instructions.md`,
        );
      });

      test("updates an unedited tool file when the tool's content changes", async () => {
        const root = await tempDir();
        await emitMaterials(DEFAULT_PLACEMENT, materials, root);
        const updated: MethodMaterials = {
          ...materials,
          baselines: [
            {
              name: "000-agent-instructions.md",
              contents: "updated governance body\n",
            },
          ],
        };

        const result = await emitMaterials(DEFAULT_PLACEMENT, updated, root);

        const path = join(root, GOVERNANCE, "000-agent-instructions.md");
        expect(await readFile(path, "utf8")).toContain(
          "updated governance body",
        );
        expect(result.written).toContain(
          `${GOVERNANCE}/000-agent-instructions.md`,
        );
      });

      test("seeds a project stub once, never overwriting it", async () => {
        const root = await tempDir();
        const stubPath = join(root, GOVERNANCE, "004-technology-contract.md");

        const first = await emitMaterials(DEFAULT_PLACEMENT, materials, root);

        expect(first.seeded).toContain(
          `${GOVERNANCE}/004-technology-contract.md`,
        );
        expect(first.seeded).toContain(DEFAULT_PLACEMENT.entryFile);
        const seeded = await readFile(stubPath, "utf8");
        expect(seeded).toBe("stub body\n");
        expect(seeded).not.toContain(METHOD_MARKER);

        await writeFile(stubPath, "filled by project\n", "utf8");
        const second = await emitMaterials(DEFAULT_PLACEMENT, materials, root);

        expect(second.seeded).toEqual([]);
        expect(await readFile(stubPath, "utf8")).toBe("filled by project\n");
      });

      test("seeds an entry file that lists the governance in order", async () => {
        const root = await tempDir();

        await emitMaterials(DEFAULT_PLACEMENT, materials, root);

        const entry = await readFile(
          join(root, DEFAULT_PLACEMENT.entryFile),
          "utf8",
        );
        expect(entry).toContain(`@${GOVERNANCE}/000-agent-instructions.md`);
        expect(entry).toContain(`@${GOVERNANCE}/004-technology-contract.md`);
        expect(entry.indexOf("000-agent-instructions")).toBeLessThan(
          entry.indexOf("004-technology-contract"),
        );
      });

      test("with seedProjectFiles false, re-emits tool-owned only — no stubs or entry file", async () => {
        const root = await tempDir();

        const result = await emitMaterials(DEFAULT_PLACEMENT, materials, root, {
          seedProjectFiles: false,
        });

        expect(result.seeded).toEqual([]);
        expect(result.written.length).toBeGreaterThan(0);
        expect(
          existsSync(join(root, GOVERNANCE, "004-technology-contract.md")),
        ).toBe(false);
        expect(existsSync(join(root, DEFAULT_PLACEMENT.entryFile))).toBe(false);
      });
    },
  );
});
