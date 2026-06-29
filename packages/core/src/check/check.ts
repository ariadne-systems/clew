import { access, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { ArchTraceables, ConTraceables, realizes } from "@ariadne-thread/trace";
import type { Layout } from "../config/config.js";
import { readLayout, readLenses } from "../config/config.js";
import { walkFiles } from "../fs/walk-files.js";
import { SPEC_STATUSES } from "../spec/generator.js";

/** A bound spec filename: a lens or story prefix, a number, an optional slug. */
const SPEC_FILENAME = /^([A-Z]+)-(\d+)(?:-.*)?\.md$/;

/** A spec's `**Status**` field line, capturing the declared value. */
const STATUS_FIELD = /^\*\*Status\*\*:[ \t]*(.+?)[ \t]*$/;

/** A single integrity violation a check found. */
export type Finding = {
  /** The check that produced it, e.g. `reference-rot`. */
  check: string;
  /** The file the violation is in, as the corpus location names it. */
  file: string;
  /** The 1-based line, when the check locates one. */
  line?: number;
  message: string;
};

export type CheckOptions = {
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
};

export type CheckResult = {
  findings: Finding[];
};

/** The corpus a check runs over, resolved once and shared across the suite. */
type CheckContext = {
  layout: Layout;
  lensIds: Set<string>;
};

/** A finding before the runner stamps which check produced it. */
type RawFinding = Omit<Finding, "check">;

/** A member of the suite: a named, deterministic check over the corpus. */
type CheckModule = {
  name: string;
  run: (context: CheckContext) => Promise<RawFinding[]>;
};

/** The suite: one list of check modules, the single place a new check is added. */
function suite(): readonly CheckModule[] {
  return [
    { name: "reference-rot", run: referenceRot },
    { name: "invalid-status", run: invalidStatus },
    { name: "duplicate-id", run: duplicateId },
  ];
}

/**
 * Runs the deterministic integrity-check suite over the corpus and returns every
 * finding. The suite is one list of check modules: the runner resolves the corpus
 * once, runs each module, and tags each finding with the check that produced it.
 */
export const check: (options?: CheckOptions) => Promise<CheckResult> = realizes(
  ArchTraceables.ARCH_005_CHECKS_ARE_ONE_SUITE,
  async (options: CheckOptions = {}): Promise<CheckResult> => {
    const [layout, lenses] = await Promise.all([
      readLayout(options.configFile),
      readLenses(options.configFile),
    ]);
    const context: CheckContext = {
      layout,
      lensIds: new Set(lenses.map((lens) => lens.id)),
    };
    const findings: Finding[] = [];
    for (const module of suite()) {
      for (const finding of await module.run(context)) {
        findings.push({ ...finding, check: module.name });
      }
    }
    return { findings };
  },
);

/** Formats the suite's findings for the terminal; a clean corpus reports nothing wrong. */
export function formatCheckReport(result: CheckResult): string {
  if (result.findings.length === 0) {
    return "check: OK — no integrity violations.\n";
  }
  const lines = result.findings.map(
    (finding) =>
      `  ${finding.file}${finding.line === undefined ? "" : `:${finding.line}`}  [${finding.check}] ${finding.message}`,
  );
  return `check: ${result.findings.length} violation(s):\n${lines.join("\n")}\n`;
}

/** A markdown link's local target — `[text](./x.md#frag)` captures `./x.md#frag`. */
const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

/**
 * The reference-rot member (CON-029): every link a spec or story makes resolves to
 * a file that exists, and a `#fragment` to a heading in that file. It is
 * type-agnostic — it confirms the link lands on a real node, not what relation it
 * expresses — so it needs none of the project's relation vocabulary.
 */
const referenceRot: (context: CheckContext) => Promise<RawFinding[]> = realizes(
  ConTraceables.CON_029_RELATION_LINK_RESOLVES,
  async (context: CheckContext): Promise<RawFinding[]> => {
    const findings: RawFinding[] = [];
    const anchorsByFile = new Map<string, Set<string>>();
    for (const file of await corpusMarkdown(context.layout)) {
      const lines = (await readFile(file, "utf8")).split("\n");
      for (const [index, line] of lines.entries()) {
        for (const target of localLinks(line)) {
          const hash = target.indexOf("#");
          const path = hash === -1 ? target : target.slice(0, hash);
          const fragment =
            hash === -1 ? "" : target.slice(hash + 1).toLowerCase();
          if (path === "") {
            continue;
          }
          const resolved = resolve(dirname(file), path);
          if (!(await pathExists(resolved))) {
            findings.push({
              file,
              line: index + 1,
              message: `link to "${target}" resolves to nothing`,
            });
          } else if (
            fragment !== "" &&
            resolved.endsWith(".md") &&
            !(await headingAnchors(resolved, anchorsByFile)).has(fragment)
          ) {
            findings.push({
              file,
              line: index + 1,
              message: `link "${target}" points at a heading that does not exist`,
            });
          }
        }
      }
    }
    return findings;
  },
);

/**
 * The invalid-status member (CON-022): a spec's `**Status**`, when present, is one
 * of the recognized values. An unrecognized value would silently drop the spec out
 * of generation, so it is reported rather than guessed.
 */
const invalidStatus: (context: CheckContext) => Promise<RawFinding[]> =
  realizes(
    ConTraceables.CON_022_VALID_STATUS,
    async (context: CheckContext): Promise<RawFinding[]> => {
      const recognized = SPEC_STATUSES as readonly string[];
      const findings: RawFinding[] = [];
      for (const spec of await specFiles(context)) {
        if (!context.lensIds.has(spec.prefix)) {
          continue;
        }
        const lines = (await readFile(spec.path, "utf8")).split("\n");
        for (const [index, line] of lines.entries()) {
          const value = STATUS_FIELD.exec(line)?.[1];
          if (value !== undefined && !recognized.includes(value)) {
            findings.push({
              file: spec.path,
              line: index + 1,
              message: `unrecognized status "${value}"; expected one of ${recognized.join(", ")}`,
            });
          }
        }
      }
      return findings;
    },
  );

/**
 * The duplicate-id member (CON-025): a bound id is declared by exactly one file.
 * This is the comprehensive detection CON-025 leaves to a separate check — across
 * every prefix, not only the lens ids the generation scan gates on.
 */
const duplicateId: (context: CheckContext) => Promise<RawFinding[]> = realizes(
  ConTraceables.CON_025_ONE_FILE_PER_SPEC_ID,
  async (context: CheckContext): Promise<RawFinding[]> => {
    const filesById = new Map<string, string[]>();
    for (const spec of await specFiles(context)) {
      const id = `${spec.prefix}-${spec.number}`;
      const group = filesById.get(id) ?? [];
      group.push(spec.path);
      filesById.set(id, group);
    }
    const findings: RawFinding[] = [];
    for (const [id, files] of filesById) {
      if (files.length > 1) {
        const sorted = [...files].sort();
        findings.push({
          file: sorted[0] as string,
          message: `spec id "${id}" is declared by more than one file: ${sorted.map((path) => `"${path}"`).join(", ")}`,
        });
      }
    }
    return findings;
  },
);

/** Every bound-id-named file in the stories and derived-specs locations. */
async function specFiles(
  context: CheckContext,
): Promise<{ path: string; prefix: string; number: string }[]> {
  const specs: { path: string; prefix: string; number: string }[] = [];
  for (const dir of [
    context.layout.stories.dir,
    context.layout.derivedSpecs.dir,
  ]) {
    for (const file of await walkFiles(dir)) {
      const match = SPEC_FILENAME.exec(file.name);
      if (match?.[1] !== undefined && match[2] !== undefined) {
        specs.push({ path: file.path, prefix: match[1], number: match[2] });
      }
    }
  }
  return specs;
}

/** The markdown files of the spec corpus: the stories, the derived specs, and the domain model. */
async function corpusMarkdown(layout: Layout): Promise<string[]> {
  const files: string[] = [];
  for (const dir of [layout.stories.dir, layout.derivedSpecs.dir]) {
    for (const file of await walkFiles(dir)) {
      if (file.name.endsWith(".md")) {
        files.push(file.path);
      }
    }
  }
  if (await pathExists(layout.entities.file)) {
    files.push(layout.entities.file);
  }
  return files;
}

/** The local link targets on a line — not an external URL, not a bare `#anchor`. */
function* localLinks(line: string): Generator<string> {
  for (const match of line.matchAll(LINK)) {
    const target = match[1];
    if (
      target !== undefined &&
      !target.startsWith("#") &&
      !/^[a-z][a-z0-9+.-]*:/i.test(target)
    ) {
      yield target;
    }
  }
}

/** GitHub-style heading slugs declared in a markdown file, cached per file. */
async function headingAnchors(
  file: string,
  cache: Map<string, Set<string>>,
): Promise<Set<string>> {
  const cached = cache.get(file);
  if (cached !== undefined) {
    return cached;
  }
  const slugs = new Set<string>();
  const seen = new Map<string, number>();
  for (const line of (await readFile(file, "utf8")).split("\n")) {
    const heading = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
    if (heading === null || heading[1] === undefined) {
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
  cache.set(file, slugs);
  return slugs;
}

/** Whether a path exists. */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}
