import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ClewError } from "../errors.js";
import {
  type DocumentSchema,
  type DocumentType,
  schemaFromParsed,
  splitOnSchemaFailure,
  validateDocument,
  validateOnLoad,
} from "./document-schema.js";

describe("schemaFromParsed", () => {
  const statusSet = ["planned", "active", "deprecated"];

  verifies(
    [
      ConTraceables.CON_032_VALIDATE_SCHEMA_BEFORE_USE,
      ArchTraceables.ARCH_007_SCHEMA_CORE_IS_WHAT_CLEW_READS,
    ],
    () => {
      test("normalizes a well-formed schema, defaulting onError to warn", () => {
        const schema = schemaFromParsed(
          {
            fields: {
              Title: { required: true },
              Lens: { enum: ["SW", "CON"] },
            },
          },
          "s.yml",
          statusSet,
        );
        expect(schema.onError).toBe("warn");
        expect(schema.fields.get("title")).toEqual({
          label: "Title",
          required: true,
        });
        expect(schema.fields.get("lens")).toEqual({
          label: "Lens",
          required: false,
          enum: ["SW", "CON"],
        });
      });

      test("rejects a schema that redefines the id form", () => {
        expect(() =>
          schemaFromParsed({ id: { pattern: "x" } }, "s.yml", statusSet),
        ).toThrow(ClewError);
      });

      test("accepts a Status enum that matches the value set, order-independent", () => {
        const schema = schemaFromParsed(
          { fields: { Status: { enum: ["deprecated", "planned", "active"] } } },
          "s.yml",
          statusSet,
        );
        expect(schema.fields.get("status")).toEqual({
          label: "Status",
          required: false,
          enum: ["deprecated", "planned", "active"],
        });
      });

      test("rejects a Status enum that diverges from the value set", () => {
        expect(() =>
          schemaFromParsed(
            { fields: { Status: { enum: ["planned", "active"] } } },
            "s.yml",
            statusSet,
          ),
        ).toThrow(/differs from clew's value set/i);
      });

      test("rejects an unrecognized top-level key", () => {
        expect(() =>
          schemaFromParsed({ rules: {} }, "s.yml", statusSet),
        ).toThrow(/unrecognized key/i);
      });

      test("rejects an invalid onError", () => {
        expect(() =>
          schemaFromParsed({ onError: "halt" }, "s.yml", statusSet),
        ).toThrow(/onError/);
      });
    },
  );
});

describe("validateDocument", () => {
  verifies(SwTraceables.SW_036_SCAN_VALIDATES_SCHEMA, () => {
    const schema: DocumentSchema = {
      onError: "fail",
      fields: new Map([
        ["title", { label: "Title", required: true }],
        ["lens", { label: "Lens", required: true, enum: ["SW", "CON"] }],
      ]),
    };

    test("reports a missing required field", () => {
      const document = "**Lens**: SW\n\nbody\n";
      expect(validateDocument(document, schema).map((v) => v.field)).toEqual([
        "Title",
      ]);
    });

    test("reports an inline value outside the field's enum", () => {
      const document = "**Title**\n\n**Lens**: ZZ\n";
      const violations = validateDocument(document, schema);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.message).toContain('value "ZZ"');
    });

    test("matches a field label case-insensitively", () => {
      const document = "**title**\n\n**LENS**: CON\n";
      expect(validateDocument(document, schema)).toEqual([]);
    });

    test("a conformant document has no violations", () => {
      const document = "**Title**\n\n**Lens**: SW\n";
      expect(validateDocument(document, schema)).toEqual([]);
    });

    test("inline bold in prose is not mistaken for a field", () => {
      const document = "**Title**\n\nThis **pins** the core.\n**Lens**: SW\n";
      expect(validateDocument(document, schema)).toEqual([]);
    });

    test("reports a schema field that appears out of the declared order", () => {
      const document = "**Lens**: SW\n\n**Title**\n";
      const violations = validateDocument(document, schema);
      expect(violations).toHaveLength(1);
      expect(violations[0]?.field).toBe("Title");
      expect(violations[0]?.message).toContain(
        "out of the schema-declared order",
      );
    });

    test("a field the schema does not declare may sit between declared fields", () => {
      const document = "**Title**\n\n**Notes**\n\n**Lens**: SW\n";
      expect(validateDocument(document, schema)).toEqual([]);
    });
  });
});

describe("splitOnSchemaFailure", () => {
  verifies(ConTraceables.CON_031_REJECT_SCHEMA_VIOLATION, () => {
    test("throws when any violation is fail severity", () => {
      const violations = [
        { severity: "fail" as const, field: "Title", message: "missing" },
      ];
      expect(() => splitOnSchemaFailure(violations, "d.md")).toThrow(ClewError);
    });

    test("returns warn violations without throwing", () => {
      const violations = [
        { severity: "warn" as const, field: "Title", message: "missing" },
      ];
      expect(splitOnSchemaFailure(violations, "d.md")).toEqual(violations);
    });
  });
});

describe("validateOnLoad", () => {
  verifies(SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD, () => {
    const schemas = new Map<DocumentType, DocumentSchema>([
      [
        "spec",
        {
          onError: "fail",
          fields: new Map([["title", { label: "Title", required: true }]]),
        },
      ],
    ]);

    test("throws when a spec fails its schema", () => {
      expect(() =>
        validateOnLoad("**Lens**: SW\n", "spec", schemas, "SW-001.md"),
      ).toThrow(ClewError);
    });

    test("a type with no configured schema validates trivially", () => {
      expect(
        validateOnLoad("anything", "story", schemas, "STR-001.md"),
      ).toEqual([]);
    });

    test("a conformant spec yields no warnings", () => {
      expect(
        validateOnLoad("**Title**\n", "spec", schemas, "SW-001.md"),
      ).toEqual([]);
    });
  });
});
