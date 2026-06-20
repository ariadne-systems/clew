import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Lens, SpecSetMatcher } from "./config.js";
import { AriadneError, ErrorCode } from "./errors.js";
import type { SpecSet, Traceable } from "./generator.js";

/**
 * The default matchers: one per configured lens, each selecting that lens's
 * markdown specs by their filename (e.g. lens `SW` → `^SW-.*\.md$`, matching
 * `SW-012-command.md`). This expresses the default "group by lens" through the
 * same matcher mechanism as any other grouping, rather than a dedicated code
 * path.
 */
export function lensMatchers(lenses: readonly Lens[]): SpecSetMatcher[] {
  return lenses.map((lens) => ({
    name: lens.id,
    pattern: `^${escapeRegExp(lens.id)}-.*\\.md$`,
  }));
}

type CompiledMatcher = {
  name: string;
  test: RegExp;
};

/**
 * Groups traceables into spec sets by matcher: a traceable joins the
 * set whose pattern matches its filename. The sets partition the traceables:
 *
 * - a traceable matching an `ignore` pattern is excluded from every set;
 * - a traceable matching more than one set is an overlap error;
 * - a traceable matching no set joins the `catchAll` set if one is configured,
 *   otherwise it is an unmatched error.
 *
 * Nothing is grouped into two sets or dropped silently. Empty sets are omitted,
 * and both the sets and their members are sorted, so the output is deterministic
 * and reproducible. With the default lens matchers every scanned
 * traceable carries a lens and so matches exactly one set.
 */
export const groupIntoSpecSets: (
  traceables: readonly Traceable[],
  matchers: readonly SpecSetMatcher[],
  ignorePatterns?: readonly string[],
) => SpecSet[] = realizes(
  SwTraceables.SW_015_GROUP_TRACEABLES,
  (
    traceables: readonly Traceable[],
    matchers: readonly SpecSetMatcher[],
    ignorePatterns: readonly string[] = [],
  ): SpecSet[] => {
    const ignore = ignorePatterns.map((pattern) => new RegExp(pattern));
    const catchAllName = matchers.find((matcher) => matcher.catchAll)?.name;
    const normal = compileNormalMatchers(matchers);

    const membersByName = new Map<string, Traceable[]>();
    for (const traceable of traceables) {
      if (!ignore.some((pattern) => pattern.test(traceable.filename))) {
        appendMember(
          membersByName,
          resolveSet(traceable, normal, catchAllName),
          traceable,
        );
      }
    }
    return toSortedSpecSets(membersByName);
  },
);

/** Compiles the non-catch-all matchers; a catch-all needs no pattern. */
function compileNormalMatchers(
  matchers: readonly SpecSetMatcher[],
): CompiledMatcher[] {
  const compiled: CompiledMatcher[] = [];
  for (const matcher of matchers) {
    if (!matcher.catchAll && matcher.pattern !== undefined) {
      compiled.push({ name: matcher.name, test: new RegExp(matcher.pattern) });
    }
  }
  return compiled;
}

/**
 * Resolves the single set a traceable belongs to, enforcing the partition
 * overlap and unmatched are explicit errors, and an unmatched
 * traceable joins the catch-all set when one is configured.
 */
const resolveSet = realizes(
  ConTraceables.CON_013_SPEC_SET_PARTITION,
  (
    traceable: Traceable,
    normal: readonly CompiledMatcher[],
    catchAllName: string | undefined,
  ): string => {
    const matched = normal.filter((matcher) =>
      matcher.test.test(traceable.filename),
    );
    if (matched.length > 1) {
      const names = matched.map((matcher) => matcher.name).join(", ");
      throw new AriadneError(
        ErrorCode.SPEC_SET_OVERLAP,
        `Spec ${traceable.id} (${traceable.filename}) matches more than one spec set: ${names}. Adjust the patterns so each spec matches exactly one set.`,
      );
    }
    const [single] = matched;
    if (single !== undefined) {
      return single.name;
    }
    if (catchAllName !== undefined) {
      return catchAllName;
    }
    throw new AriadneError(
      ErrorCode.SPEC_SET_UNMATCHED,
      `Spec ${traceable.id} (${traceable.filename}) matches no spec set. Add a matching set, an \`ignore\` pattern, or a catch-all set.`,
    );
  },
);

function appendMember(
  membersByName: Map<string, Traceable[]>,
  name: string,
  traceable: Traceable,
): void {
  const members = membersByName.get(name);
  if (members === undefined) {
    membersByName.set(name, [traceable]);
  } else {
    members.push(traceable);
  }
}

/** Renders the grouped members as spec sets, sorted by name then id. */
function toSortedSpecSets(membersByName: Map<string, Traceable[]>): SpecSet[] {
  return [...membersByName.entries()]
    .map(([name, members]) => ({
      name,
      traceables: members.sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

/** Escapes a literal string for safe use inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
