import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ErrorCode } from "@ariadne-thread/core";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { afterEach, describe, expect, test, vi } from "vitest";
import { buildProgram } from "../program.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
});

// Creates an isolated project with a configured TypeScript generator and one
// source file carrying markers, then switches into it so `scan` walks there.
async function setupProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-scan-"));
  await writeFile(
    join(dir, ".ariadnerc.json"),
    JSON.stringify({
      generators: [{ type: "typescript", outputDir: "out-ts" }],
    }),
    "utf8",
  );
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(
    join(dir, "src", "app.ts"),
    [
      "const a = realizes(SwTraceables.SW_001_A, 1);",
      "verifies(ConTraceables.CON_002_B, () => {});",
      "",
    ].join("\n"),
    "utf8",
  );
  process.chdir(dir);
  return dir;
}

function captureStdout(): () => string {
  const chunks: string[] = [];
  vi.spyOn(process.stdout, "write").mockImplementation((chunk): boolean => {
    chunks.push(
      typeof chunk === "string" ? chunk : Buffer.from(chunk).toString(),
    );
    return true;
  });
  return () => chunks.join("");
}

async function runAriadne(...args: string[]): Promise<void> {
  await buildProgram().parseAsync(["node", "ariadne", ...args]);
}

describe("scan command", () => {
  verifies(SwTraceables.SW_023_SCAN_COMMAND, () => {
    test("reports the anchors and writes the locations index", async () => {
      const dir = await setupProjectDir();
      const stdout = captureStdout();

      await runAriadne("scan");

      expect(stdout()).toContain("Found 2 anchors");
      expect(stdout()).toContain("SW-001 realizes src/app.ts:1");
      expect(stdout()).toContain("CON-002 verifies src/app.ts:2");

      const index = JSON.parse(
        await readFile(join(dir, ".ariadne", "locations.json"), "utf8"),
      );
      expect(index).toEqual({
        locations: [
          { id: "SW-001", relation: "realizes", file: "src/app.ts", line: 1 },
          { id: "CON-002", relation: "verifies", file: "src/app.ts", line: 2 },
        ],
      });
    });

    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "scan", "extra"]),
      ).toThrow();
    });
  });
});

describe("scan configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("scan fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-scan-noconfig-"));
      process.chdir(dir);

      await expect(runAriadne("scan")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
