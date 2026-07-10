import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { readSchemas } from "../config/config.js";
import type { DocumentSchema, DocumentType } from "./document-schema.js";
import { schemaFromParsed } from "./document-schema.js";

/** The document types that may carry a schema, in a stable order. */
const DOCUMENT_TYPES: readonly DocumentType[] = ["story", "spec"];

/**
 * Loads and self-validates the configured per-document-type schemas, resolving each
 * schema file under the project root and parsing its YAML. A document
 * type with no configured schema is absent from the map, so only the pinned core
 * applies to it. A malformed or overreaching schema is rejected with its path, before
 * any document is validated against it.
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
      const text = await readFile(join(projectRoot, file), "utf8");
      schemas.set(type, schemaFromParsed(parse(text), file));
    }
  }
  return schemas;
}
