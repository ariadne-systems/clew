import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Lens, SpecSetMatcher } from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import { escapeRegExp } from "../text/escape-regexp.js";
import type { ScannedSpec, SpecSet } from "./generator.js";

/**
 * The default matchers: one per configured lens, each selecting that lens's
 * markdown specs by their filename (e.g. lens `SW` → `^SW-.*\.md$`, matching
 * `SW-NNN-command.md`).
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
 * Groups specs into spec sets by matcher: a spec joins the
 * set whose pattern matches its filename. The sets partition the specs:
 *
 * - a spec matching an `ignore` pattern is excluded from every set;
 * - a spec matching more than one set is an overlap error;
 * - a spec matching no set joins the `catchAll` set if one is configured,
 *   otherwise it is an unmatched error.
 *
 * Nothing is grouped into two sets or dropped silently. Empty sets are omitted,
 * and both the sets and their members are sorted. With the default lens matchers
 * every scanned spec carries a lens and so matches exactly one set.
 */
export const groupIntoSpecSets: (
  specs: readonly ScannedSpec[],
  matchers: readonly SpecSetMatcher[],
  ignorePatterns?: readonly string[],
) => SpecSet[] = realizes(
  SwTraceables.SW_015_GROUP_TRACEABLES,
  (
    specs: readonly ScannedSpec[],
    matchers: readonly SpecSetMatcher[],
    ignorePatterns: readonly string[] = [],
  ): SpecSet[] => {
    const ignore = ignorePatterns.map((pattern) => new RegExp(pattern));
    const catchAllName = matchers.find((matcher) => matcher.catchAll)?.name;
    const normal = compileNormalMatchers(matchers);

    const membersByName = new Map<string, ScannedSpec[]>();
    for (const spec of specs) {
      if (!ignore.some((pattern) => pattern.test(spec.filename))) {
        appendMember(
          membersByName,
          resolveSet(spec, normal, catchAllName),
          spec,
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
 * Resolves the single set a spec belongs to, enforcing the partition
 * overlap and unmatched are explicit errors, and an unmatched
 * spec joins the catch-all set when one is configured.
 */
const resolveSet = realizes(
  ConTraceables.CON_013_SPEC_SET_PARTITION,
  (
    spec: ScannedSpec,
    normal: readonly CompiledMatcher[],
    catchAllName: string | undefined,
  ): string => {
    const matched = normal.filter((matcher) =>
      matcher.test.test(spec.filename),
    );
    if (matched.length > 1) {
      const names = matched.map((matcher) => matcher.name).join(", ");
      throw new ClewError(
        ErrorCode.SPEC_SET_OVERLAP,
        `Spec ${spec.id} (${spec.filename}) matches more than one spec set: ${names}. Adjust the patterns so each spec matches exactly one set.`,
      );
    }
    const [single] = matched;
    if (single !== undefined) {
      return single.name;
    }
    if (catchAllName !== undefined) {
      return catchAllName;
    }
    throw new ClewError(
      ErrorCode.SPEC_SET_UNMATCHED,
      `Spec ${spec.id} (${spec.filename}) matches no spec set. Add a matching set, an \`ignore\` pattern, or a catch-all set.`,
    );
  },
);

function appendMember(
  membersByName: Map<string, ScannedSpec[]>,
  name: string,
  spec: ScannedSpec,
): void {
  const members = membersByName.get(name);
  if (members === undefined) {
    membersByName.set(name, [spec]);
  } else {
    members.push(spec);
  }
}

/** Renders the grouped members as spec sets, sorted by name then id. */
function toSortedSpecSets(
  membersByName: Map<string, ScannedSpec[]>,
): SpecSet[] {
  return [...membersByName.entries()]
    .map(([name, members]) => ({
      name,
      specs: members.sort((left, right) => left.id.localeCompare(right.id)),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}
