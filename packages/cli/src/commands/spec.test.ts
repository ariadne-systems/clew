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

// Creates an isolated project with a spec tree and a config listing the real
// generators, then switches into it so `spec` scans there and writes generated
// files locally.
async function setupProjectDir(idFilenames: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-spec-"));
  await writeFile(
    join(dir, ".ariadnerc.json"),
    JSON.stringify({
      generators: [
        { type: "typescript", outputDir: "out-ts" },
        { type: "java", outputDir: "out-java" },
      ],
    }),
    "utf8",
  );
  const specDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(specDir, { recursive: true });
  for (const name of idFilenames) {
    // Specs must be `active` to be generated; the status filter drops `planned`.
    await writeFile(join(specDir, name), "**Status**: active\n", "utf8");
  }
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

describe("spec output", () => {
  verifies(
    [
      SwTraceables.SW_012_SPEC_COMMAND,
      ConTraceables.CON_012_GENERATED_FILES_TOOL_OWNED,
    ],
    () => {
      test("scans the specs and writes a generated file per configured generator", async () => {
        const dir = await setupProjectDir(["SW-012-a.md", "CON-012-b.md"]);
        const stdout = captureStdout();

        await runAriadne("spec");

        expect(stdout()).toContain("Scanned 2 traceables in 2 spec sets.");
        const tsDir = join(dir, "out-ts", "clew");
        const swSet = await readFile(join(tsDir, "SwTraceables.ts"), "utf8");
        expect(swSet).toContain('"SW-012"');
        const helper = await readFile(join(tsDir, "index.ts"), "utf8");
        expect(helper).toContain("export type TraceableId");
        const java = await readFile(
          join(dir, "out-java", "clew", "SwTraceables.java"),
          "utf8",
        );
        expect(java).toContain("SW_012");
        const annotation = await readFile(
          join(dir, "out-java", "clew", "annotation", "RealizesSw.java"),
          "utf8",
        );
        expect(annotation).toContain("public @interface RealizesSw");
      });

      test("a second run on unchanged specs writes byte-identical output", async () => {
        const dir = await setupProjectDir(["SW-012-a.md"]);
        const generated = join(dir, "out-ts", "clew", "index.ts");

        captureStdout();
        await runAriadne("spec");
        const first = await readFile(generated, "utf8");

        vi.restoreAllMocks();
        captureStdout();
        await runAriadne("spec");
        const second = await readFile(generated, "utf8");

        expect(second).toBe(first);
      });
    },
  );
});

describe("spec invalid invocation", () => {
  verifies(SwTraceables.SW_012_SPEC_COMMAND, () => {
    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "spec", "extra"]),
      ).toThrow();
    });

    test("an unknown option exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "spec", "--bogus"]),
      ).toThrow();
    });
  });
});

describe("configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("spec fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-spec-noconfig-"));
      process.chdir(dir);

      await expect(runAriadne("spec")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
