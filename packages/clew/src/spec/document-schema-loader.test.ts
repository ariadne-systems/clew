import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { ErrorCode } from "../errors.js";
import { loadSchemas } from "./document-schema-loader.js";

describe("loading configured schemas", () => {
  test("a schema path that escapes the project root is rejected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "clew-schema-"));
    const configFile = join(dir, ".clewrc.json");
    await writeFile(
      configFile,
      JSON.stringify({ schemas: { story: "../../../etc/passwd" } }),
      "utf8",
    );

    await expect(loadSchemas(configFile, dir)).rejects.toMatchObject({
      code: ErrorCode.INVALID_SCHEMA,
    });
  });

  test("an absolute schema path is rejected", async () => {
    const dir = await mkdtemp(join(tmpdir(), "clew-schema-"));
    const configFile = join(dir, ".clewrc.json");
    await writeFile(
      configFile,
      JSON.stringify({ schemas: { spec: "/etc/passwd" } }),
      "utf8",
    );

    await expect(loadSchemas(configFile, dir)).rejects.toMatchObject({
      code: ErrorCode.INVALID_SCHEMA,
    });
  });
});
