import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { ConTraceables, realizes } from "@ariadne-thread/trace";
import type { MethodFile, MethodMaterials } from "./harness.js";

/** The nearest ancestor of this module holding a `package.json` — the clew package root, in dev and when installed. */
function packageRoot(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  while (!existsSync(join(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) {
      throw new Error(
        "could not resolve the clew package root for method templates",
      );
    }
    dir = parent;
  }
  return dir;
}

/** The shipped method-templates directory, resolved relative to the package. */
function templatesDir(): string {
  return join(packageRoot(), "templates");
}

/**
 * Reads a method file's body, dropping a leading copyright comment so clew's
 * copyright never travels into the project the method is emitted into — the
 * emitted method is the project's to own and license, not clew's.
 */
async function readMethodBody(path: string): Promise<string> {
  return withoutLeadingCopyright(await readFile(path, "utf8"));
}

/** Removes a leading HTML-comment copyright line and any blank line following it. */
const withoutLeadingCopyright = realizes(
  ConTraceables.CON_033_METHOD_SCAFFOLD_TOOL_OWNED,
  (contents: string): string =>
    contents.replace(/^<!--[^\n]*copyright[^\n]*-->\r?\n\r?\n?/i, ""),
);

/** Reads a flat directory of markdown files into method files, name-sorted. */
async function readFlat(dir: string): Promise<MethodFile[]> {
  const names = (await readdir(dir)).filter((name) => name.endsWith(".md"));
  names.sort();
  const files: MethodFile[] = [];
  for (const name of names) {
    files.push({ name, contents: await readMethodBody(join(dir, name)) });
  }
  return files;
}

/** Reads the skills: one `SKILL.md` per skill directory, keyed by the directory name. */
async function readSkills(dir: string): Promise<MethodFile[]> {
  const entries = (await readdir(dir, { withFileTypes: true })).filter(
    (entry) => entry.isDirectory(),
  );
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const skills: MethodFile[] = [];
  for (const entry of entries) {
    skills.push({
      name: entry.name,
      contents: await readMethodBody(join(dir, entry.name, "SKILL.md")),
    });
  }
  return skills;
}

/** Loads the neutral method materials from the package templates (ADR-0008 D6). */
export async function loadMethodMaterials(): Promise<MethodMaterials> {
  const templates = templatesDir();
  const [baselines, skills, stubs] = await Promise.all([
    readFlat(join(templates, "baselines")),
    readSkills(join(templates, "skills")),
    readFlat(join(templates, "stubs")),
  ]);
  return { baselines, skills, stubs };
}

/** Loads the tool-owned ADR template the ADR practice is seeded from. */
export async function loadAdrTemplate(): Promise<string> {
  return readMethodBody(join(templatesDir(), "adr", "ADR-template.md"));
}
