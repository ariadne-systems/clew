import { DEFAULT_LENSES, type Waiver } from "./config.js";

/** Where setup writes the default document schemas, relative to the project root. */
export const DEFAULT_SCHEMA_DIR = "docs/spec/schemas";
export const STORY_SCHEMA_FILE = "story.schema.yaml";
export const SPEC_SCHEMA_FILE = "spec.schema.yaml";

/** The opinionated story document-schema template (ADR-0001 D8). */
export const DEFAULT_STORY_SCHEMA: string = `# Document schema for stories (the \`story\` document type).
# clew merges this with the pinned core (id form, \`**Status**\` grammar, relation
# links) it always enforces. Fields are listed in the order a story must present them.
onError: fail
fields:
  Title:
    required: true
  Business Value:
    required: true
  Problem / Context:
    required: true
  Solution Approach:
    required: true
  Acceptance Criteria:
    required: true
  Out of scope:
    required: true
`;

/** The opinionated spec document-schema template; the \`Lens\` enum is the default lens set. */
export const DEFAULT_SPEC_SCHEMA: string = `# Document schema for specs (SW, CON, ARCH, NF, STK, SYS, ...).
# clew merges this with the pinned core (id form, \`**Status**\` grammar and value
# set, relation links) it always enforces — so Status is not listed here, and Lens
# carries only the allowed values.
onError: fail
fields:
  Title:
    required: true
  Lens:
    required: true
    enum: [${DEFAULT_LENSES.map((lens) => lens.id).join(", ")}]
  Description:
    required: true
  Rationale:
    required: true
  Verification Description:
    required: true
`;

/** Where setup seeds the project architecture overview, relative to the project root. */
export const ARCHITECTURE_DOC_FILE = "docs/spec/architecture.md";

/** The narrative architecture overview setup seeds once; the project fills it, and the enforceable rules live as ARCH/CON specs. */
export const DEFAULT_ARCHITECTURE_DOC: string = `# Architecture

<!-- Fill this in for your project. clew scaffolds the shape; the content is yours, and clew never overwrites it. -->

This document is the narrative framing for the project — it explains the shape.
The atomic, enforceable architecture rules are authored as ARCH and CON specs; those specs are what the code is checked against.

## Shape

Describe the modules, their responsibilities, and how they compose.

## Dependency direction

State the dependencies that must hold, and the ones that must never.
`;

/** The default coverage waiver setup writes. */
export const DEFAULT_WAIVERS: readonly Waiver[] = [
  {
    pattern: "STK-*",
    reason:
      "stakeholder needs are verified by acceptance, not by an automated test",
  },
];

/** The tool-output entries setup ensures in the project's `.gitignore`; `state.json` stays tracked. */
export const GITIGNORE_ENTRIES: readonly string[] = [
  ".clew/locations.json",
  ".clew/coverage.json",
];
export const GITIGNORE_HEADER =
  "# clew: regenerated tool output (state.json stays tracked)";
