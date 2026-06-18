import type { Lens } from "./config.js";
import type { SpecSet, Traceable } from "./generator.js";

/**
 * A named grouping of traceables, selected by a regular expression over the
 * spec id. Grouping by lens — the default — is just one matcher per lens (see
 * `lensMatchers`), so the same mechanism handles any grouping. The configurable
 * matchers, exclusion (`ignore`) patterns, and partition rules are the follow-on
 * story (STR-012) and are not built here.
 */
export interface SpecSetMatcher {
  readonly name: string;
  /**
   * Regular-expression source matched against the spec's filename. The filename
   * carries the descriptive slug (e.g. `SW-012-command.md`), so a matcher can
   * select on more than the lens prefix the id alone exposes.
   */
  readonly pattern: string;
}

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

/**
 * Groups traceables into spec sets by matcher (SW-013): a traceable joins the
 * set of the first matcher whose pattern matches its filename. Empty sets are
 * dropped, and both the sets and their members are sorted, so the grouping is
 * deterministic and the generated output reproducible (CON-012). Overlap,
 * unmatched, and `ignore` rules are defined by the follow-on story (STR-012) and
 * are not enforced here; with the default lens matchers every scanned traceable
 * carries a lens and so matches exactly one set.
 */
export function groupIntoSpecSets(
  traceables: readonly Traceable[],
  matchers: readonly SpecSetMatcher[],
): SpecSet[] {
  const compiled = matchers.map((matcher) => ({
    name: matcher.name,
    test: new RegExp(matcher.pattern),
  }));
  const membersByName = new Map<string, Traceable[]>();
  for (const traceable of traceables) {
    const matched = compiled.find((matcher) =>
      matcher.test.test(traceable.filename),
    );
    if (matched !== undefined) {
      appendMember(membersByName, matched.name, traceable);
    }
  }
  return [...membersByName.entries()]
    .map(([name, members]) => ({
      name,
      traceables: members.sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

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

/** Escapes a literal string for safe use inside a regular expression. */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
