/**
 * Where a target agent's method lands, as data the caller supplies — not a
 * per-agent module. The engine consumes a placement uniformly and names no
 * target agent; clew ships one default (below), and the setup skill supplies any
 * other agent's values from that agent's own conventions.
 */
export interface Placement {
  /**
   * A human-readable label of which agent these locations are for (for example
   * `claude`, `cursor`). A description only, so a reader can tell the config's
   * target at a glance — the engine never branches on it.
   */
  readonly type: string;
  /** The directory the agent scans for its skills (for example `.claude/skills`). */
  readonly skillsDir: string;
  /** The directory the layered governance files (`000`–`006`) are written to. */
  readonly governanceDir: string;
  /**
   * The entry file that loads the governance. Its name is how the agent picks the
   * list up: an import-style entry file (like the default `CLAUDE.md`) treats each
   * line as a hard import; an `AGENTS.md` entry file is read as a plain list.
   */
  readonly entryFile: string;
}

/** The shipped default — Claude Code's conventions; a bare `clew setup` uses it. */
export const DEFAULT_PLACEMENT: Placement = {
  type: "claude",
  skillsDir: ".claude/skills",
  governanceDir: ".claude/.ai-project-context",
  entryFile: "CLAUDE.md",
};

/**
 * The project-owned entry file that points the agent at the layered governance:
 * a load-in-order header and one `@path` line per governance file. Claude and
 * Gemini treat each line as a hard import; the `AGENTS.md` agents read the same
 * list and open the files themselves — a softer guarantee the standards have not
 * yet closed (AGENTS.md import is still an open question). This renders only the
 * wiring lines, never the charter, and stays project-owned so the project extends it.
 */
export function governanceIndex(
  governanceFiles: readonly string[],
  governanceDir: string,
): string {
  const imports = governanceFiles
    .map((name) => `@${governanceDir}/${name}`)
    .join("\n");
  return `# Agent context

Load the governance contract before working, in order:

${imports}

<!-- Add project-specific instructions below. -->
`;
}
