import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { AriadneError, ErrorCode } from "../errors.js";

/**
 * The built-in default exclusions, as repository-root-relative globs (CON-016,
 * CON-018). A bare segment matches only at the root; a leading `**` matches at any depth.
 * Dependency and build directories recur per module, so they use a leading `**`; the
 * tool's own state directory is root-only. The configured generators' output
 * directories are added to these per scan.
 */
const DEFAULT_GLOBS: readonly string[] = [
  "**/node_modules",
  "**/.git",
  "**/dist",
  "**/build",
  "**/coverage",
  ".ariadne",
];

/** A compiled exclusion glob: a full-path matcher and per-segment matchers for descent analysis. */
export type CompiledGlob = {
  /** Matches a full repository-root-relative path. */
  readonly match: RegExp;
  /** One matcher per pattern segment; `null` marks a `**` segment. */
  readonly segments: readonly (RegExp | null)[];
};

/** The compiled exclusion rules, in precedence layers (CON-017). */
export type ExclusionRules = {
  readonly userExcludes: readonly CompiledGlob[];
  readonly unexcludes: readonly CompiledGlob[];
  readonly defaults: readonly CompiledGlob[];
};

/** The raw patterns a scan compiles its rules from. */
export type ExclusionInput = {
  readonly exclude: readonly string[];
  readonly unexclude: readonly string[];
  /** Configured generator output directories, excluded as root-relative paths. */
  readonly outputDirs: readonly string[];
};

/**
 * Compiles the exclusion rules from the configured patterns and the generator
 * output directories (SW-025). Every pattern is compiled up front; an
 * uncompilable `exclude` or `unexclude` glob fails fast with a stable error
 * naming it, rather than silently degrading to a pattern that never matches.
 */
export const compileExclusionRules: (input: ExclusionInput) => ExclusionRules =
  realizes(
    SwTraceables.SW_025_READ_EXCLUSION_PATTERNS,
    (input: ExclusionInput): ExclusionRules => ({
      userExcludes: input.exclude.map((glob) =>
        compileOrThrow(glob, "exclude"),
      ),
      unexcludes: input.unexclude.map((glob) =>
        compileOrThrow(glob, "unexclude"),
      ),
      defaults: [
        ...DEFAULT_GLOBS,
        ...input.outputDirs.map(normalizeDirectory),
      ].map(compileGlob),
    }),
  );

/**
 * Whether a path is excluded, by precedence (CON-017): a user `exclude` match —
 * on the path or any ancestor directory — wins; otherwise an `unexclude` match
 * re-includes it; otherwise a built-in default match excludes it; otherwise it is
 * included. Matching an ancestor counts, so a file under an excluded directory is
 * excluded unless an `unexclude` re-includes it.
 */
export const fileExcluded: (path: string, rules: ExclusionRules) => boolean =
  realizes(
    ConTraceables.CON_017_EXCLUSION_PRECEDENCE,
    (path: string, rules: ExclusionRules): boolean => {
      const prefixes = ancestorsAndSelf(path);
      if (matchesAny(rules.userExcludes, prefixes)) {
        return true;
      }
      if (matchesAny(rules.unexcludes, prefixes)) {
        return false;
      }
      return matchesAny(rules.defaults, prefixes);
    },
  );

/**
 * Whether the walk should descend into a directory (SW-024). A directory a user
 * `exclude` matches is never descended (the veto is absolute). A directory a
 * built-in default would exclude is descended only when some `unexclude` could
 * match a path beneath it — otherwise it is pruned, so a tree like `node_modules`
 * is never walked when nothing re-includes into it. Files inside a descended tree
 * still get the per-file decision.
 */
export const shouldDescend: (
  dirPath: string,
  rules: ExclusionRules,
) => boolean = realizes(
  SwTraceables.SW_024_EXCLUDE_MATCHING_PATHS,
  (dirPath: string, rules: ExclusionRules): boolean => {
    const prefixes = ancestorsAndSelf(dirPath);
    if (matchesAny(rules.userExcludes, prefixes)) {
      return false;
    }
    if (!matchesAny(rules.defaults, prefixes)) {
      return true;
    }
    return rules.unexcludes.some((glob) => couldMatchBelow(dirPath, glob));
  },
);

/** Compiles a glob, wrapping a compile failure in a stable error that names the pattern and its array. */
function compileOrThrow(glob: string, which: string): CompiledGlob {
  try {
    return compileGlob(glob);
  } catch (error) {
    throw new AriadneError(
      ErrorCode.INVALID_EXCLUSION_PATTERN,
      `Invalid glob "${glob}" in \`${which}\`: ${(error as Error).message}.`,
    );
  }
}

function compileGlob(glob: string): CompiledGlob {
  return {
    match: globToRegExp(glob),
    segments: glob
      .split("/")
      .map((segment) => (segment === "**" ? null : globToRegExp(segment))),
  };
}

/**
 * Compiles a glob to a case-sensitive, anchored regular expression over a
 * repository-root-relative, forward-slash path (CON-018). A leading `**` matches any depth
 * (including none), `**` matches across segments, `*` matches within a segment,
 * `?` a single non-slash character, and `[…]` a character class. Throws on an
 * uncompilable pattern (an unterminated character class).
 */
const globToRegExp: (glob: string) => RegExp = realizes(
  ConTraceables.CON_018_ROOT_RELATIVE_GLOBS,
  (glob: string): RegExp => {
    let regex = "";
    let index = 0;
    while (index < glob.length) {
      const char = glob[index] ?? "";
      if (char === "*" && glob[index + 1] === "*" && glob[index + 2] === "/") {
        regex += "(?:.*/)?";
        index += 3;
      } else if (char === "*" && glob[index + 1] === "*") {
        regex += ".*";
        index += 2;
      } else if (char === "*") {
        regex += "[^/]*";
        index += 1;
      } else if (char === "?") {
        regex += "[^/]";
        index += 1;
      } else if (char === "[") {
        const [classRegex, next] = readCharClass(glob, index);
        regex += classRegex;
        index = next;
      } else {
        regex += escapeLiteral(char);
        index += 1;
      }
    }
    return new RegExp(`^${regex}$`);
  },
);

/** Reads a `[…]` character class from `start`, returning its regex and the index past the closing `]`. */
function readCharClass(glob: string, start: number): [string, number] {
  let index = start + 1;
  let body = "";
  if (glob[index] === "!") {
    body += "^";
    index += 1;
  }
  if (glob[index] === "]") {
    body += "\\]";
    index += 1;
  }
  while (index < glob.length && glob[index] !== "]") {
    if (glob[index] === "\\") {
      body += `\\${glob[index + 1] ?? ""}`;
      index += 2;
    } else {
      body += glob[index];
      index += 1;
    }
  }
  if (index >= glob.length) {
    throw new Error("unterminated character class");
  }
  return [`[${body}]`, index + 1];
}

/** The regex metacharacters a literal glob character must be escaped against. */
const REGEX_METACHARACTERS = "\\^$.|?*+()[]{}";

/** Escapes a literal glob character for use in a regular expression. */
function escapeLiteral(char: string): string {
  return REGEX_METACHARACTERS.includes(char) ? `\\${char}` : char;
}

/** The path and each of its ancestor directories, root-first (a/b/c yields a, then a/b, then a/b/c). */
function ancestorsAndSelf(path: string): string[] {
  const prefixes: string[] = [];
  let current = "";
  for (const segment of path.split("/")) {
    current = current === "" ? segment : `${current}/${segment}`;
    prefixes.push(current);
  }
  return prefixes;
}

/** Whether any glob matches any of the given paths. */
function matchesAny(
  globs: readonly CompiledGlob[],
  paths: readonly string[],
): boolean {
  return globs.some((glob) => paths.some((path) => glob.match.test(path)));
}

/** Whether the glob could match some path strictly beneath `dirPath` (a conservative prefix test). */
function couldMatchBelow(dirPath: string, glob: CompiledGlob): boolean {
  const dirSegments = dirPath.split("/");
  let dirIndex = 0;
  let patternIndex = 0;
  while (dirIndex < dirSegments.length) {
    if (patternIndex >= glob.segments.length) {
      return false;
    }
    const matcher = glob.segments[patternIndex];
    if (matcher === null || matcher === undefined) {
      return true;
    }
    if (!matcher.test(dirSegments[dirIndex] ?? "")) {
      return false;
    }
    dirIndex += 1;
    patternIndex += 1;
  }
  return true;
}

/** Normalizes a configured directory to a root-relative, forward-slash path. */
function normalizeDirectory(dir: string): string {
  return dir.replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+$/, "");
}
