#!/usr/bin/env node
/**
 * Reference-rot lint.
 *
 * Every relative markdown link and every `@import` / `@`-include in the intent
 * corpus must resolve to a file that exists. This guards the prose layer the
 * type-checker cannot see: a renamed spec leaves its links dangling, a moved doc
 * orphans its `@import`s, a mistyped heading anchor points nowhere, and nothing in
 * the build notices — exactly how the spec corpus's links and the declatrace `@import`s
 * rotted. A link's `#fragment` is checked against the target file's heading slugs;
 * external URLs and bare intra-document anchors are not.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The committed intent corpus. Drafts are scratch and may reference unpromoted
// specs, so they are excluded.
const ROOTS = [
  "CLAUDE.md",
  "docs",
  ".claude/.ai-project-context",
  ".claude/skills",
];
const EXCLUDE_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "target",
  "drafts",
]);

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function collectMarkdown(absPath, found) {
  if (!existsSync(absPath)) {
    return;
  }
  if (statSync(absPath).isFile()) {
    if (absPath.endsWith(".md")) {
      found.push(absPath);
    }
    return;
  }
  for (const entry of readdirSync(absPath, { withFileTypes: true })) {
    if (entry.isDirectory() && EXCLUDE_DIRS.has(entry.name)) {
      continue;
    }
    collectMarkdown(join(absPath, entry.name), found);
  }
}

/** The local references declared on a line — markdown links and `@`-includes. */
function* references(line) {
  for (const match of line.matchAll(LINK)) {
    const target = match[1];
    if (!(target.startsWith("#") || /^[a-z][a-z0-9+.-]*:/i.test(target))) {
      yield { kind: "link", target };
    }
  }
  const trimmed = line.trim();
  if (trimmed.startsWith("@")) {
    const rest = trimmed.slice(1).replace(/^import\s+/, "");
    if (rest.includes("/") && /^[\w./-]+\.[a-z]+$/i.test(rest)) {
      yield { kind: "import", target: rest };
    }
  }
}

/** GitHub-style heading slugs declared in a markdown file (cached per file). */
const anchorsByFile = new Map();
function headingAnchors(absFile) {
  const cached = anchorsByFile.get(absFile);
  if (cached !== undefined) {
    return cached;
  }
  const slugs = new Set();
  const seen = new Map();
  for (const line of readFileSync(absFile, "utf8").split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading === null) {
      continue;
    }
    const base = heading[1]
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    slugs.add(count === 0 ? base : `${base}-${count}`);
  }
  anchorsByFile.set(absFile, slugs);
  return slugs;
}

const files = [];
for (const root of ROOTS) {
  collectMarkdown(join(repoRoot, root), files);
}

const problems = [];
for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const [index, line] of lines.entries()) {
    for (const { kind, target } of references(line)) {
      const hash = target.indexOf("#");
      const path = hash === -1 ? target : target.slice(0, hash);
      const fragment = hash === -1 ? "" : target.slice(hash + 1).toLowerCase();
      if (path === "") {
        continue;
      }
      const resolved = resolve(dirname(file), path);
      const at = { file: relative(repoRoot, file), line: index + 1, target };
      if (!existsSync(resolved)) {
        problems.push({ ...at, kind });
      } else if (
        kind === "link" &&
        fragment !== "" &&
        resolved.endsWith(".md") &&
        !headingAnchors(resolved).has(fragment)
      ) {
        problems.push({ ...at, kind: "anchor" });
      }
    }
  }
}

if (problems.length === 0) {
  console.log(
    `reference-rot: OK — every link, @import, and heading anchor across ${files.length} files resolves.`,
  );
  process.exit(0);
}

console.error(`reference-rot: ${problems.length} dangling reference(s):\n`);
for (const problem of problems) {
  console.error(
    `  ${problem.file}:${problem.line}  [${problem.kind}] ${problem.target}`,
  );
}
process.exit(1);
