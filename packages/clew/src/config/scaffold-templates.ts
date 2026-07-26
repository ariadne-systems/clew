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

export const STORY_EXAMPLE_FILE = "story.example.md";
export const SPEC_EXAMPLE_FILE = "spec.example.md";

/**
 * A minimal, valid example story in the field format clew reads — a copyable
 * template beside the schema, so a fresh project has a form to follow rather than
 * guessing it. Each field is a bold label; a heading is not a field.
 */
export const DEFAULT_STORY_EXAMPLE: string = `<!--
Example story — copy this shape. Each field below is a bold label (Title,
Business Value, ...) on its own line, in the order shown. A "#"/"##" heading is
NOT a field: clew detects a field only as a bold label written like the ones
below. The "## Relations" section links the specs the story realizes and the
existing specs it relates to — the ids and paths here are placeholders to
replace. This file sits beside the schemas, not in the stories directory, so
clew never treats it as a real story.
-->

**Title**
A concise, decisive statement of the increment

**Business Value**
Why the work matters — the benefit to the users or the project.

**Problem / Context**
What is missing or wrong today, and the context the increment sits in.

**Solution Approach**
How the increment is carried out, at a high level — the decisions, not the code.

**Acceptance Criteria**
- A checkable outcome the increment must meet.
- Another — each one a test or a review could confirm.

**Out of scope**
- What this increment deliberately does not do.

## Relations

**Realizes**

- [SW-001 — The behaviour this story delivers](../specs/SW-001-the-behaviour.md)

**Related**

- [SW-002 — An existing spec this story touches](../specs/SW-002-a-related-spec.md)
`;

/**
 * A minimal, valid example spec in the field format clew reads — a copyable
 * template beside the schema. Lens and Status carry an inline value after the colon.
 */
export const DEFAULT_SPEC_EXAMPLE: string = `<!--
Example spec — copy this shape. Each field below is a bold label; Lens and Status
carry an inline value after the colon, as shown. Status is one of planned |
active | deprecated (planned is the default and generates no traceable). A
"#"/"##" heading is NOT a field. The "## Relations" section links what the spec
realizes, concerns, or relates to — the ids and paths here are placeholders to
replace (a sibling spec is linked by bare filename). This file sits beside the
schemas, not in the specs directory, so clew never treats it as a real spec.
-->

**Title**
The one decision this spec pins, stated concretely

**Lens**: SW

**Status**: active

**Description**
The single behaviour, rule, or decision this spec fixes — what it requires and,
where there is a real choice, what it excludes.

**Rationale**
Why this decision and not the alternatives.

**Verification Description**
How a test or a review confirms the decision holds.

## Relations

**Realizes**

- [SYS-001 — The system capability this realizes](SYS-001-the-capability.md)

**Related**

- [CON-001 — A constraint this spec must respect](CON-001-a-related-constraint.md)
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
