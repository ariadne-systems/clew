#!/usr/bin/env node
/**
 * Sync the generic method materials — the governance baselines and the clew skills
 * — from clew's own `.claude` into the package templates it ships (ADR-0008 D6).
 * clew's `.claude` is the single source; this copies it into `templates/` so the
 * published package carries the exact method clew dogfoods. A drift test
 * (`src/harness/materials.test.ts`) fails if `templates/` and `.claude` disagree,
 * so re-run this whenever the baselines or skills change. The stubs and the ADR
 * template are authored skeletons under `templates/` and are not touched here.
 */
import { cp, mkdir, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const templates = join(repoRoot, "packages", "clew", "templates");
const governanceSrc = join(repoRoot, ".claude", ".ai-project-context");
const skillsSrc = join(repoRoot, ".claude", "skills");

/** The generic governance baselines (000–003, 006); 004/005 are project stubs, not shipped filled. */
const BASELINES = [
  "000-agent-instructions.md",
  "001-charta.md",
  "002-architecture.md",
  "003-developer-guidelines.md",
  "006-spec-conventions.md",
];

const baselinesOut = join(templates, "baselines");
await rm(baselinesOut, { recursive: true, force: true });
await mkdir(baselinesOut, { recursive: true });
for (const name of BASELINES) {
  await cp(join(governanceSrc, name), join(baselinesOut, name));
}

const skillsOut = join(templates, "skills");
await rm(skillsOut, { recursive: true, force: true });
await mkdir(skillsOut, { recursive: true });
for (const entry of await readdir(skillsSrc, { withFileTypes: true })) {
  if (entry.isDirectory()) {
    await mkdir(join(skillsOut, entry.name), { recursive: true });
    await cp(
      join(skillsSrc, entry.name, "SKILL.md"),
      join(skillsOut, entry.name, "SKILL.md"),
    );
  }
}

console.log(
  `synced ${BASELINES.length} baselines and the skills into ${templates}`,
);
