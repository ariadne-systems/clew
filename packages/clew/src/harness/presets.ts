import { DEFAULT_PLACEMENT, type Placement } from "./placement.js";

/**
 * The known agents' locations, as data — the single point where clew names a
 * target agent. `clew setup --type <name>` resolves against this so the agent
 * needs to supply only its own name; the emitter itself branches on no agent.
 * Each entry is verified against that agent's own documentation, and every value
 * here is a caller's default, overridable per field with `--skills-dir` and its
 * siblings. Governance goes to a vendor-neutral `.ai-project-context` for every
 * agent but Claude, whose own `.claude/.ai-project-context` is the shipped default.
 */
export const AGENT_PRESETS: Readonly<Record<string, Placement>> = {
  claude: DEFAULT_PLACEMENT,
  gemini: {
    type: "gemini",
    skillsDir: ".gemini/skills",
    governanceDir: ".ai-project-context",
    entryFile: "GEMINI.md",
  },
  cursor: {
    type: "cursor",
    skillsDir: ".cursor/skills",
    governanceDir: ".ai-project-context",
    entryFile: "AGENTS.md",
  },
  zed: {
    type: "zed",
    skillsDir: ".agents/skills",
    governanceDir: ".ai-project-context",
    entryFile: "AGENTS.md",
  },
  amp: {
    type: "amp",
    skillsDir: ".agents/skills",
    governanceDir: ".ai-project-context",
    entryFile: "AGENTS.md",
  },
  codex: {
    type: "codex",
    skillsDir: ".agents/skills",
    governanceDir: ".ai-project-context",
    entryFile: "AGENTS.md",
  },
  copilot: {
    type: "copilot",
    skillsDir: ".github/skills",
    governanceDir: ".ai-project-context",
    entryFile: "AGENTS.md",
  },
};
