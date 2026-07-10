import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
  SysTraceables,
} from "@ariadne-thread/trace";
import { ClewError, ErrorCode } from "../errors.js";

/** How a project-field violation is treated: `warn` reports without stopping, `fail` rejects. */
export type SchemaSeverity = "warn" | "fail";

/** A document type that carries a schema. */
export type DocumentType = "story" | "derived-spec";

/** A project-defined rule for one document field. */
export interface FieldRule {
  /** The label as authored, for messages. */
  label: string;
  /** Whether the field must be present. */
  required: boolean;
  /** The allowed inline values, when the field carries one (e.g. `**Lens**: SW`). */
  enum?: readonly string[];
}

/** A validated project schema for one document type — the project-defined half of the contract. */
export interface DocumentSchema {
  /** How a project-field violation is treated. */
  onError: SchemaSeverity;
  /**
   * Field rules keyed by the lower-cased label, so a `**Bold label**` matches
   * case-insensitively. Iteration order is the schema's declared field order, and
   * is enforced as the required order of the document's fields.
   */
  fields: ReadonlyMap<string, FieldRule>;
}

/** A document's violation of its schema's project fields. */
export interface DocumentViolation {
  /** The schema's severity for the violation: `fail` rejects, `warn` reports. */
  severity: SchemaSeverity;
  /** The field the violation concerns. */
  field: string;
  message: string;
}

const SEVERITIES: readonly SchemaSeverity[] = ["warn", "fail"];

/** The one field whose value set clew owns; a schema may require it, but not redefine its values. */
const PINNED_STATUS_LABEL = "status";

/**
 * Validates a parsed schema against clew's minimum contract and returns it
 * normalized. The shape must be recognized — an `onError` of `warn`/`fail`
 * and `fields` of label → `{ required?, enum? }` — and it may not reach into the
 * pinned core: no `id` (the id form is clew's), and no `enum` on the
 * `Status` field (the status value set is clew's). A schema that fails is rejected
 * with its location, before any document is validated against it.
 */
export const schemaFromParsed: (
  parsed: unknown,
  location: string,
) => DocumentSchema = realizes(
  [
    ConTraceables.CON_032_VALIDATE_SCHEMA_BEFORE_USE,
    ArchTraceables.ARCH_007_SCHEMA_CORE_IS_WHAT_CLEW_READS,
  ],
  (parsed: unknown, location: string): DocumentSchema => {
    const root = asMapping(parsed, location, "the schema");
    if ("id" in root) {
      throw invalidSchema(
        location,
        "it sets `id`, but the id form is clew's and a schema cannot redefine it",
      );
    }
    rejectUnknownKeys(root, ["onError", "fields"], location);
    return {
      onError: readSeverity(root.onError, location),
      fields: readFields(root.fields, location),
    };
  },
);

function readSeverity(value: unknown, location: string): SchemaSeverity {
  if (value === undefined) {
    return "warn";
  }
  if (
    typeof value !== "string" ||
    !SEVERITIES.includes(value as SchemaSeverity)
  ) {
    throw invalidSchema(
      location,
      `\`onError\` must be one of ${SEVERITIES.join(", ")}`,
    );
  }
  return value as SchemaSeverity;
}

function readFields(
  value: unknown,
  location: string,
): ReadonlyMap<string, FieldRule> {
  const fields = new Map<string, FieldRule>();
  if (value === undefined) {
    return fields;
  }
  for (const [label, ruleValue] of Object.entries(
    asMapping(value, location, "`fields`"),
  )) {
    fields.set(label.toLowerCase(), readFieldRule(label, ruleValue, location));
  }
  return fields;
}

function readFieldRule(
  label: string,
  value: unknown,
  location: string,
): FieldRule {
  const raw = asMapping(value, location, `field \`${label}\``);
  rejectUnknownKeys(raw, ["required", "enum"], location);
  const required = readBoolean(raw.required, label, location);
  const enumValues = readEnum(raw.enum, label, location);
  if (label.toLowerCase() === PINNED_STATUS_LABEL && enumValues !== undefined) {
    throw invalidSchema(
      location,
      "it sets an `enum` on `Status`, but the status value set is clew's and cannot be redefined",
    );
  }
  return enumValues === undefined
    ? { label, required }
    : { label, required, enum: enumValues };
}

function readBoolean(value: unknown, label: string, location: string): boolean {
  if (value === undefined) {
    return false;
  }
  if (typeof value !== "boolean") {
    throw invalidSchema(
      location,
      `\`required\` of field \`${label}\` must be a boolean`,
    );
  }
  return value;
}

function readEnum(
  value: unknown,
  label: string,
  location: string,
): readonly string[] | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) {
    throw invalidSchema(
      location,
      `\`enum\` of field \`${label}\` must be a list of strings`,
    );
  }
  return value as string[];
}

function asMapping(
  value: unknown,
  location: string,
  what: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidSchema(location, `${what} must be a mapping`);
  }
  return value as Record<string, unknown>;
}

function rejectUnknownKeys(
  obj: Record<string, unknown>,
  allowed: readonly string[],
  location: string,
): void {
  const unknown = Object.keys(obj).find((key) => !allowed.includes(key));
  if (unknown !== undefined) {
    throw invalidSchema(
      location,
      `unrecognized key \`${unknown}\`; allowed keys are ${allowed.join(", ")}`,
    );
  }
}

function invalidSchema(location: string, reason: string): ClewError {
  return new ClewError(ErrorCode.INVALID_SCHEMA, `invalid schema: ${reason}`, {
    location,
    help: "a schema may set only `onError` and `fields`; it cannot redefine clew's id form or the **Status** values",
  });
}

/** A `**Bold label**` field line: the label, and its inline value when written `**Label**: value`. */
const FIELD_LINE = /^\*\*([^*]+)\*\*(?::[ \t]*(.*?))?[ \t]*$/;

/**
 * Validates a document's `**Bold label**` fields against a project schema:
 * a violation per missing required field, per inline value outside a field's
 * `enum`, and per schema-declared field that appears out of the declared order.
 * A field label is matched case-insensitively; a field the schema does not declare
 * is ignored, so it may sit anywhere. The pinned core (id, uniqueness,
 * `**Status**`, relation links) is enforced elsewhere; this is the project-field layer.
 */
export const validateDocument: (
  content: string,
  schema: DocumentSchema,
) => DocumentViolation[] = realizes(
  SwTraceables.SW_036_SCAN_VALIDATES_SCHEMA,
  (content: string, schema: DocumentSchema): DocumentViolation[] => {
    const present = documentFields(content);
    const violations: DocumentViolation[] = [];
    for (const rule of schema.fields.values()) {
      const field = present.get(rule.label.toLowerCase());
      if (field === undefined) {
        if (rule.required) {
          violations.push({
            severity: schema.onError,
            field: rule.label,
            message: `missing required field "${rule.label}"`,
          });
        }
      } else if (
        rule.enum !== undefined &&
        field.value !== undefined &&
        !rule.enum.includes(field.value)
      ) {
        violations.push({
          severity: schema.onError,
          field: rule.label,
          message: `field "${rule.label}" value "${field.value}" is not one of ${rule.enum.join(", ")}`,
        });
      }
    }
    violations.push(...orderViolations(present, schema));
    return violations;
  },
);

/**
 * Reports each present schema field that appears out of the schema's declared
 * order. The schema-declared fields present in the document must appear in the
 * order the schema declares them; a field the schema does not declare is ignored,
 * so it may sit anywhere between them. A field placed before one that the schema
 * declares earlier is the violation, named against that earlier field.
 */
function orderViolations(
  present: ReadonlyMap<string, { value?: string }>,
  schema: DocumentSchema,
): DocumentViolation[] {
  const schemaIndex = new Map(
    [...schema.fields.keys()].map((key, index): [string, number] => [
      key,
      index,
    ]),
  );
  const violations: DocumentViolation[] = [];
  let furthest = -1;
  let furthestKey: string | undefined;
  for (const key of present.keys()) {
    const index = schemaIndex.get(key);
    if (index !== undefined) {
      if (index < furthest && furthestKey !== undefined) {
        const rule = schema.fields.get(key);
        const after = schema.fields.get(furthestKey);
        violations.push({
          severity: schema.onError,
          field: rule?.label ?? key,
          message: `field "${rule?.label ?? key}" is out of the schema-declared order; it must appear before "${after?.label ?? furthestKey}"`,
        });
      } else {
        furthest = index;
        furthestKey = key;
      }
    }
  }
  return violations;
}

/** The `**Bold label**` fields present in a document, keyed by lower-cased label, with any inline value. */
function documentFields(content: string): Map<string, { value?: string }> {
  const fields = new Map<string, { value?: string }>();
  for (const line of content.split(/\r?\n/)) {
    const match = FIELD_LINE.exec(line);
    if (match?.[1] !== undefined) {
      const value =
        match[2] === undefined || match[2] === "" ? undefined : match[2];
      fields.set(
        match[1].trim().toLowerCase(),
        value === undefined ? {} : { value },
      );
    }
  }
  return fields;
}

/**
 * Throws when any violation is `fail` severity, naming the document and the failing
 * fields, and returns the `warn` violations for the caller to report. The pinned
 * core always fails, so a pinned-core violation is passed in as `fail`.
 */
export const splitOnSchemaFailure: (
  violations: readonly DocumentViolation[],
  location: string,
) => DocumentViolation[] = realizes(
  ConTraceables.CON_031_REJECT_SCHEMA_VIOLATION,
  (
    violations: readonly DocumentViolation[],
    location: string,
  ): DocumentViolation[] => {
    const failures = violations.filter(
      (violation) => violation.severity === "fail",
    );
    if (failures.length > 0) {
      throw new ClewError(
        ErrorCode.SCHEMA_VIOLATION,
        "document does not conform to its schema",
        {
          location,
          note: failures.map((violation) => violation.message).join("; "),
          help: [
            "add the missing fields, use an allowed value, or reorder the fields to match the schema",
            "run `clew check` to see all validation issues at once",
          ],
        },
      );
    }
    return violations.filter((violation) => violation.severity === "warn");
  },
);

/**
 * Validates one document of `type` against the loaded schemas as it is read.
 * A `fail`-severity violation throws; `warn` violations are returned for the caller
 * to report. A type with no configured schema validates trivially — only the pinned
 * core, enforced elsewhere, applies.
 */
export const validateOnLoad: (
  content: string,
  type: DocumentType,
  schemas: ReadonlyMap<DocumentType, DocumentSchema>,
  location: string,
) => DocumentViolation[] = realizes(
  SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD,
  (
    content: string,
    type: DocumentType,
    schemas: ReadonlyMap<DocumentType, DocumentSchema>,
    location: string,
  ): DocumentViolation[] => {
    const schema = schemas.get(type);
    if (schema === undefined) {
      return [];
    }
    return splitOnSchemaFailure(validateDocument(content, schema), location);
  },
);
