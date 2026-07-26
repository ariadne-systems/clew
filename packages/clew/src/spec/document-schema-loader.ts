import { readFile } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { ConTraceables, realizes } from "@ariadne-thread/trace";
import { parse } from "yaml";
import { readSchemas } from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import type { DocumentSchema, DocumentType } from "./document-schema.js";
import { schemaFromParsed } from "./document-schema.js";

/** The document types that may carry a schema, in a stable order. */
const DOCUMENT_TYPES: readonly DocumentType[] = ["story", "spec"];

const resolveWithinRoot: (projectRoot: string, file: string) => string =
  realizes(
    ConTraceables.CON_040_SCHEMA_PATH_WITHIN_ROOT,
    (projectRoot: string, file: string): string => {
      const root = resolve(projectRoot);
      const resolved = resolve(root, file);
      const rel = relative(root, resolved);
      if (
        rel === "" ||
        rel === ".." ||
        rel.startsWith(`..${sep}`) ||
        isAbsolute(rel)
      ) {
        throw new ClewError(
          ErrorCode.INVALID_SCHEMA,
          `Schema file path "${file}" escapes the project root.`,
          {
            location: file,
            help: "point the schema at a file inside the project",
          },
        );
      }
      return resolved;
    },
  );

/**
 * Loads and self-validates the configured per-document-type schemas, parsing each
 * schema file's YAML. A document type with no configured schema is absent from the
 * map. A malformed or overreaching schema is rejected with its path, before any
 * document is validated against it.
 */
export async function loadSchemas(
  configFile: string | undefined,
  projectRoot: string,
): Promise<Map<DocumentType, DocumentSchema>> {
  const config = await readSchemas(configFile);
  const schemas = new Map<DocumentType, DocumentSchema>();
  for (const type of DOCUMENT_TYPES) {
    const file = config[type];
    if (file !== undefined) {
      const text = await readFile(resolveWithinRoot(projectRoot, file), "utf8");
      schemas.set(type, schemaFromParsed(parse(text), file));
    }
  }
  return schemas;
}
