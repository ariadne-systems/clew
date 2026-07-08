import { access, readFile } from "node:fs/promises";
import {
  basename,
  dirname,
  extname,
  isAbsolute,
  join,
  relative,
  resolve,
} from "node:path";
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
import { walkProject } from "../fs/walk-files.js";
import type { DocumentSchema, DocumentType } from "../spec/document-schema.js";
import { validateDocument } from "../spec/document-schema.js";
import { loadSchemas } from "../spec/document-schema-loader.js";
import type { ExclusionRules } from "../spec/exclusions.js";
import {
  compileExclusionRules,
  fileExcluded,
  shouldDescend,
} from "../spec/exclusions.js";
import type { Generator } from "../spec/generator.js";
import {
  generatorsByExtension,
  resolveGeneratorOrThrow,
  SPEC_STATUSES,
} from "../spec/generator.js";

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
  /**
   * Resolves a configured generator name to its implementation, injected so the
   * core depends on no concrete generator (ADR-0001 D9), exactly as the scan does.
   * The spec-id-in-comment check reads each source through its generator's comment
   * detection, so it runs only when a resolver is supplied; the corpus checks need
   * none and always run.
   */
  resolveGenerator?: (name: string) => Generator | undefined;
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
  /** The project root every check walks from. */
  projectRoot: string;
  /** The resolved generators — their source extensions select code files, their comment detection reads them. */
  generators: readonly Generator[];
  /** The compiled exclusion rules every check honours. */
  exclusion: ExclusionRules;
  /** The spec-tree markdown files (stories, derived specs), walked once and shared by the corpus checks. */
  specTreeFiles: readonly string[];
  /** The loaded per-document-type schemas; an empty map when none is configured. */
  schemas: ReadonlyMap<DocumentType, DocumentSchema>;
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
    { name: "document-schema", run: documentSchema },
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
    const [layout, lenses, prefixes, exclude, unexclude, generatorConfigs] =
      await Promise.all([
        readLayout(options.configFile),
        readLenses(options.configFile),
        readConfiguredPrefixes(options.configFile),
        readExclude(options.configFile),
        readUnexclude(options.configFile),
        readGenerators(options.configFile),
      ]);
    const resolveGenerator = options.resolveGenerator;
    const generators =
      resolveGenerator === undefined
        ? []
        : generatorConfigs.map((config) =>
            resolveGeneratorOrThrow(config.type, resolveGenerator),
          );
    const corpus = {
      layout,
      lensIds: new Set(lenses.map((lens) => lens.id)),
      prefixes,
      projectRoot,
      generators,
      exclusion: compileExclusionRules({ exclude, unexclude }),
    };
    const context: CheckContext = {
      ...corpus,
      specTreeFiles: await specTreeMarkdown(corpus),
      schemas: await loadSchemas(options.configFile, projectRoot),
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
    for (const file of corpusMarkdown(context)) {
      const absolute = join(context.projectRoot, file);
      const lines = (await readFile(absolute, "utf8")).split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        for (const target of localLinks(line)) {
          const finding = await brokenLink(
            context,
            { file, absolute, line: index + 1 },
            target,
            anchorsByFile,
          );
          if (finding !== undefined) {
            findings.push(finding);
          }
        }
      }
    }
    return findings;
  },
);

/**
 * The reference-rot finding for one link target, or undefined when it resolves. A
 * link to an excluded path is skipped: an excluded path is invisible to every check,
 * so its existence and headings are neither read nor validated.
 */
async function brokenLink(
  context: CheckContext,
  at: { file: string; absolute: string; line: number },
  target: string,
  anchorsByFile: Map<string, Set<string>>,
): Promise<RawFinding | undefined> {
  const hash = target.indexOf("#");
  const path = hash === -1 ? target : target.slice(0, hash);
  if (path === "") {
    return undefined;
  }
  const resolved = resolve(dirname(at.absolute), path);
  if (
    fileExcluded(toRelative(context.projectRoot, resolved), context.exclusion)
  ) {
    return undefined;
  }
  if (!(await pathExists(resolved))) {
    return {
      file: at.file,
      line: at.line,
      message: `link to "${target}" resolves to nothing`,
    };
  }
  const fragment = hash === -1 ? "" : target.slice(hash + 1).toLowerCase();
  if (
    fragment !== "" &&
    resolved.endsWith(".md") &&
    !(await headingAnchors(resolved, anchorsByFile)).has(fragment)
  ) {
    return {
      file: at.file,
      line: at.line,
      message: `link "${target}" points at a heading that does not exist`,
    };
  }
  return undefined;
}

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
      for (const spec of specFiles(context)) {
        if (!context.lensIds.has(spec.prefix)) {
          continue;
        }
        const lines = (
          await readFile(join(context.projectRoot, spec.path), "utf8")
        ).split(/\r?\n/);
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
      const generatorByExtension = generatorsByExtension(context.generators);
      if (generatorByExtension.size === 0) {
        return [];
      }
      const files = await walkProject(context.projectRoot, {
        descend: (dir) => shouldDescend(dir, context.exclusion),
        accept: (path) =>
          generatorByExtension.has(extname(path)) &&
          !fileExcluded(path, context.exclusion),
      });
      const findings: RawFinding[] = [];
      for (const file of files) {
        const generator = generatorByExtension.get(extname(file));
        if (generator !== undefined) {
          const content = await readFile(
            join(context.projectRoot, file),
            "utf8",
          );
          findings.push(
            ...commentSpecIdFindings(file, content, generator, pattern),
          );
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

/** The spec-id-in-comment findings in one source file, via its generator's comment detection. */
function commentSpecIdFindings(
  file: string,
  content: string,
  generator: Generator,
  pattern: RegExp,
): RawFinding[] {
  const findings: RawFinding[] = [];
  for (const span of generator.findComments(content)) {
    span.text.split("\n").forEach((commentLine, offset) => {
      for (const match of commentLine.matchAll(pattern)) {
        findings.push({
          file,
          line: span.line + offset,
          message: `spec id "${match[0]}" in a comment must appear only inside its anchor`,
        });
      }
    });
  }
  return findings;
}

/**
 * The document-schema member: each story and derived spec satisfies its type's
 * schema — its project-required fields are present and its inline values are in
 * range. Both severities are reported here, since `check` is the standing
 * gate; the scan and promote block on `fail`. With no schema configured, nothing is
 * checked beyond the pinned core the other members already enforce.
 */
const documentSchema: (context: CheckContext) => Promise<RawFinding[]> =
  realizes(
    SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD,
    async (context: CheckContext): Promise<RawFinding[]> => {
      if (context.schemas.size === 0) {
        return [];
      }
      const storyPrefix = context.layout.stories.prefix;
      const findings: RawFinding[] = [];
      for (const file of context.specTreeFiles) {
        // A story is identified by its bound id prefix (e.g. `STR-`), not by the
        // directory it sits in.
        const type: DocumentType = basename(file).startsWith(`${storyPrefix}-`)
          ? "story"
          : "derived-spec";
        const schema = context.schemas.get(type);
        if (schema !== undefined) {
          const content = await readFile(
            join(context.projectRoot, file),
            "utf8",
          );
          for (const violation of validateDocument(content, schema)) {
            findings.push({
              file,
              message: `${violation.severity}: ${violation.message}`,
            });
          }
        }
      }
      return findings;
    },
  );

/** A path made project-root-relative with forward slashes, so findings and exclusion matching name a file one way. */
function toRelative(projectRoot: string, target: string): string {
  const rel = isAbsolute(target) ? relative(projectRoot, target) : target;
  return rel.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}

/** Whether the walk should enter `dir` to reach a spec-tree directory — it is an ancestor, the dir itself, or inside it. */
function withinSpecTree(dir: string, specTreeDirs: readonly string[]): boolean {
  return specTreeDirs.some(
    (specDir) =>
      specDir === dir ||
      specDir.startsWith(`${dir}/`) ||
      dir.startsWith(`${specDir}/`),
  );
}

/**
 * The markdown files in the spec-tree directories (stories, derived specs), as
 * project-root-relative forward-slash paths — walked from the project root and
 * honouring the exclusions, the same walk and root the code check uses, so every
 * check names its file the same way.
 */
async function specTreeMarkdown(
  context: Pick<CheckContext, "projectRoot" | "layout" | "exclusion">,
): Promise<string[]> {
  const specTreeDirs = [
    context.layout.stories.dir,
    context.layout.derivedSpecs.dir,
  ].map((dir) => toRelative(context.projectRoot, dir));
  return walkProject(context.projectRoot, {
    descend: (dir) =>
      withinSpecTree(dir, specTreeDirs) &&
      shouldDescend(dir, context.exclusion),
    accept: (path) =>
      path.endsWith(".md") &&
      specTreeDirs.some((dir) => path.startsWith(`${dir}/`)) &&
      !fileExcluded(path, context.exclusion),
  });
}

/** Every bound-id-named file in the (already-walked) spec-tree, with its parsed prefix and number. */
function specFiles(
  context: CheckContext,
): { path: string; prefix: string; number: string }[] {
  const specs: { path: string; prefix: string; number: string }[] = [];
  for (const path of context.specTreeFiles) {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const match = SPEC_FILENAME.exec(name);
    if (match?.[1] !== undefined && match[2] !== undefined) {
      specs.push({ path, prefix: match[1], number: match[2] });
    }
  }
  return specs;
}

/** The markdown of the spec corpus: the (already-walked) spec-tree files, project-root-relative. */
function corpusMarkdown(context: CheckContext): string[] {
  return [...context.specTreeFiles];
}

/** The local link targets on a line — not an external URL, not a bare `#anchor`. */
function* localLinks(line: string): IterableIterator<string> {
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
  for (const line of (await readFile(file, "utf8")).split(/\r?\n/)) {
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
