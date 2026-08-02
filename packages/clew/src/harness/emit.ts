import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ArchTraceables, ConTraceables, realizes } from "@ariadne-thread/trace";
import { writeIfAbsent } from "../fs/files.js";
import type { EmitOptions, EmittedMethod, MethodMaterials } from "./harness.js";
import { governanceIndex, type Placement } from "./placement.js";
import { type ReconcileOutcome, reconcileMethodFile } from "./reconcile.js";

/**
 * Emits the neutral method materials into a placement's locations. Governance
 * baselines and skills are tool-owned — reconciled each run. The project stubs
 * and the governance entry file are project-owned — seeded once, then the
 * project's to keep. The engine names no target agent: the placement is data
 * the caller supplies.
 */
export const emitMaterials: (
  placement: Placement,
  materials: MethodMaterials,
  projectRoot: string,
  options?: EmitOptions,
) => Promise<EmittedMethod> = realizes(
  [
    ArchTraceables.ARCH_008_METHOD_BEHIND_HARNESS_ADAPTER,
    ConTraceables.CON_033_METHOD_SCAFFOLD_TOOL_OWNED,
  ],
  async (
    placement: Placement,
    materials: MethodMaterials,
    projectRoot: string,
    options?: EmitOptions,
  ): Promise<EmittedMethod> => {
    const written: string[] = [];
    const preserved: string[] = [];
    const place = (outcome: ReconcileOutcome, path: string): void => {
      (outcome === "written" ? written : preserved).push(path);
    };
    for (const baseline of materials.baselines) {
      const path = `${placement.governanceDir}/${baseline.name}`;
      place(
        await reconcileMethodFile(join(projectRoot, path), baseline.contents),
        path,
      );
    }
    for (const skill of materials.skills) {
      const path = `${placement.skillsDir}/${skill.name}/SKILL.md`;
      place(
        await reconcileMethodFile(join(projectRoot, path), skill.contents),
        path,
      );
    }
    const seeded: string[] = [];
    if (options?.seedProjectFiles !== false) {
      for (const stub of materials.stubs) {
        const path = `${placement.governanceDir}/${stub.name}`;
        if (await seedIfAbsent(projectRoot, path, stub.contents)) {
          seeded.push(path);
        }
      }
      // The entry file is project-owned: seeded once with the governance load
      // order, then the project's to extend (below the marker line it carries).
      const governance = [...materials.baselines, ...materials.stubs]
        .map((file) => file.name)
        .sort();
      const index = governanceIndex(governance, placement.governanceDir);
      if (await seedIfAbsent(projectRoot, placement.entryFile, index)) {
        seeded.push(placement.entryFile);
      }
    }
    return { written, seeded, preserved };
  },
);

/** Writes a project-owned file only when it does not exist (`wx`); returns whether it wrote. */
async function seedIfAbsent(
  root: string,
  path: string,
  contents: string,
): Promise<boolean> {
  const absolute = join(root, path);
  await mkdir(dirname(absolute), { recursive: true });
  return writeIfAbsent(absolute, contents);
}
