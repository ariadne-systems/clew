import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes } from "@ariadne-thread/trace";
import { writeIfAbsent } from "../../fs/files.js";
import type {
  EmitOptions,
  EmittedMethod,
  HarnessAdapter,
  MethodMaterials,
} from "../harness.js";
import { type ReconcileOutcome, reconcileMethodFile } from "../reconcile.js";

/** Claude Code reads governance from this directory and skills from `.claude/skills`. */
const GOVERNANCE_DIR = ".claude/.ai-project-context";
const SKILLS_DIR = ".claude/skills";

/** The Claude Code harness adapter: places the neutral method materials in Claude's locations. */
export const createClaudeHarness: () => HarnessAdapter = realizes(
  ConTraceables.CON_033_METHOD_SCAFFOLD_TOOL_OWNED,
  (): HarnessAdapter => ({
    name: "claude",
    async emit(
      materials: MethodMaterials,
      projectRoot: string,
      options?: EmitOptions,
    ): Promise<EmittedMethod> {
      const written: string[] = [];
      const preserved: string[] = [];
      const place = (outcome: ReconcileOutcome, path: string): void => {
        (outcome === "written" ? written : preserved).push(path);
      };
      for (const baseline of materials.baselines) {
        const path = `${GOVERNANCE_DIR}/${baseline.name}`;
        place(
          await reconcileMethodFile(join(projectRoot, path), baseline.contents),
          path,
        );
      }
      for (const skill of materials.skills) {
        const path = `${SKILLS_DIR}/${skill.name}/SKILL.md`;
        place(
          await reconcileMethodFile(join(projectRoot, path), skill.contents),
          path,
        );
      }
      const seeded: string[] = [];
      if (options?.seedProjectFiles !== false) {
        for (const stub of materials.stubs) {
          const path = `${GOVERNANCE_DIR}/${stub.name}`;
          if (await seedIfAbsent(projectRoot, path, stub.contents)) {
            seeded.push(path);
          }
        }
        // The CLAUDE.md index is project-owned: seeded once with the governance
        // load order, then the project's to extend.
        const governance = [...materials.baselines, ...materials.stubs]
          .map((file) => file.name)
          .sort();
        if (
          await seedIfAbsent(projectRoot, "CLAUDE.md", claudeIndex(governance))
        ) {
          seeded.push("CLAUDE.md");
        }
      }
      return { written, seeded, preserved };
    },
  }),
);

/** The CLAUDE.md index that loads the governance files in order, with a place for project notes. */
function claudeIndex(governanceFiles: readonly string[]): string {
  const imports = governanceFiles
    .map((name) => `@${GOVERNANCE_DIR}/${name}`)
    .join("\n");
  return `# Agent context

Load the governance contract before working, in order:

${imports}

<!-- Add project-specific instructions below. -->
`;
}

/** Writes a project-owned stub only when it does not exist (`wx`); returns whether it wrote. */
async function seedIfAbsent(
  root: string,
  path: string,
  contents: string,
): Promise<boolean> {
  const absolute = join(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  return writeIfAbsent(absolute, contents);
}
