import type { Dirent } from "node:fs";
import { access, readdir, readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
  SysTraceables,
} from "@ariadne-thread/trace";
import type { Layout } from "../config/config.js";
import {
  readConfiguredPrefixes,
  readExclude,
  readGenerators,
  readLayout,
  readLenses,
  readUnexclude,
} from "../config/config.js";
import { walkFiles } from "../fs/walk-files.js";
import type { ExclusionRules } from "../spec/exclusions.js";
import {
  compileExclusionRules,
  fileExcluded,
  shouldDescend,
} from "../spec/exclusions.js";
import { SPEC_STATUSES } from "../spec/generator.js";
import { commentFinderFor } from "./comment-finders.js";

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
  /** Project root the code checks walk. Defaults to the config file's directory, else cwd. */
  projectRoot?: string;
};

export type CheckResult = {
  findings: Finding[];
};

/** The corpus a check runs over, resolved once and shared across the suite. */
type CheckContext = {
  layout: Layout;
  lensIds: Set<string>;
  /** The configured spec prefixes (lens ids plus the story and entity prefixes). */
  prefixes: Set<string>;
  /** The project root the code checks walk. */
  projectRoot: string;
  /** The compiled exclusion rules a code scan honours. */
  exclusion: ExclusionRules;
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
    { name: "spec-id-in-comment", run: specIdInComment },
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
    const projectRoot =
      options.projectRoot ??
      (options.configFile === undefined ? "." : dirname(options.configFile));
    const [layout, lenses, prefixes, exclude, unexclude, generators] =
      await Promise.all([
        readLayout(options.configFile),
        readLenses(options.configFile),
        readConfiguredPrefixes(options.configFile),
        readExclude(options.configFile),
        readUnexclude(options.configFile),
        readGenerators(options.configFile),
      ]);
    const context: CheckContext = {
      layout,
      lensIds: new Set(lenses.map((lens) => lens.id)),
      prefixes,
      projectRoot,
      exclusion: compileExclusionRules({
        exclude,
        unexclude,
        outputDirs: generators.flatMap((generator) =>
          generator.outputDir === undefined ? [] : [generator.outputDir],
        ),
      }),
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
 * The reference-rot member: every link a spec or story makes resolves to
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
 * The invalid-status member: a spec's `**Status**`, when present, is one
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
 * The duplicate-id member: a bound id is declared by exactly one file.
 * This is the comprehensive detection deferred from the generation scan — across
 * every prefix, not only the lens ids generation gates on.
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

/**
 * The spec-id-in-comment member: a spec id may live in code only inside an anchor
 * — the underscore form the compiler checks — never in a comment or a name. It
 * scans each source file's comments, found by the per-language finder, for a
 * hyphenated spec-id token of a configured prefix; the underscore anchor form
 * never matches, so a real anchor never trips.
 */
const specIdInComment: (context: CheckContext) => Promise<RawFinding[]> =
  realizes(
    [
      SysTraceables.SYS_014_DETECT_REFERENCES_BYPASSING_ANCHOR,
      SwTraceables.SW_033_FLAG_SPEC_ID_IN_COMMENT,
      ConTraceables.CON_026_SPEC_ID_ONLY_IN_ANCHOR,
    ],
    async (context: CheckContext): Promise<RawFinding[]> => {
      const pattern = specIdPattern(context.prefixes);
      if (pattern === undefined) {
        return [];
      }
      const findings: RawFinding[] = [];
      for (const file of await codeFiles(context)) {
        const finder = commentFinderFor(file);
        if (finder === undefined) {
          continue;
        }
        const content = await readFile(join(context.projectRoot, file), "utf8");
        for (const span of finder(content)) {
          for (const [offset, commentLine] of span.text.split("\n").entries()) {
            for (const match of commentLine.matchAll(pattern)) {
              findings.push({
                file,
                line: span.line + offset,
                message: `spec id "${match[0]}" in a comment must appear only inside its anchor`,
              });
            }
          }
        }
      }
      return findings;
    },
  );

/** A global pattern matching a hyphenated spec id of any configured prefix, or undefined when none. */
function specIdPattern(prefixes: Set<string>): RegExp | undefined {
  if (prefixes.size === 0) {
    return undefined;
  }
  const alternation = [...prefixes].sort().join("|");
  return new RegExp(`\\b(?:${alternation})-\\d+\\b`, "g");
}

/** The code files under the project root a comment finder can read, honouring the exclusions. */
async function codeFiles(context: CheckContext): Promise<string[]> {
  const files: string[] = [];
  await walk("");
  return files;

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir =
      relativeDir === ""
        ? context.projectRoot
        : join(context.projectRoot, relativeDir);
    let entries: Dirent[];
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativeChild =
        relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (shouldDescend(relativeChild, context.exclusion)) {
          await walk(relativeChild);
        }
      } else if (
        entry.isFile() &&
        commentFinderFor(entry.name) !== undefined &&
        !fileExcluded(relativeChild, context.exclusion)
      ) {
        files.push(relativeChild);
      }
    }
  }
}

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
