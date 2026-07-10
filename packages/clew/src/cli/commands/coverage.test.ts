import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ErrorCode } from "../../index.js";
import { buildProgram } from "../program.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
});

// An isolated project: a configured generator, two active spec files (which
// generate into the trace — the universe coverage reads back), a source file that
// realizes one of them, and a waiver accepting that realized spec's missing test;
// the other spec, anchored nowhere, stays a genuine gap.
async function setupProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-cli-coverage-"));
  await writeFile(
    join(dir, ".clewrc.json"),
    JSON.stringify({
      generators: [{ type: "typescript", outputDir: "out-ts" }],
      waivers: [{ id: "SW-001", reason: "verified by acceptance" }],
    }),
    "utf8",
  );
  const specsDir = join(dir, "docs", "spec", "specs");
  await mkdir(specsDir, { recursive: true });
  await writeFile(
    join(specsDir, "SW-001-a.md"),
    "**Status**: active\n# SW-001\n",
    "utf8",
  );
  await writeFile(
    join(specsDir, "SW-002-b.md"),
    "**Status**: active\n# SW-002\n",
    "utf8",
  );
  await mkdir(join(dir, "src"), { recursive: true });
  await writeFile(
    join(dir, "src", "app.ts"),
    "const a = realizes(SwTraceables.SW_001_A, 1);\n",
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

async function runClew(...args: string[]): Promise<void> {
  await buildProgram().parseAsync(["node", "clew", ...args]);
}

describe("coverage command", () => {
  verifies(SwTraceables.SW_029_COVERAGE_COMMAND, () => {
    test("reports coverage and writes coverage.json, exiting 0 with gaps", async () => {
      const dir = await setupProjectDir();
      const stdout = captureStdout();

      // Coverage reads the universe back from the generated trace, so
      // generate it first.
      await runClew("spec");
      await runClew("coverage");

      const out = stdout();
      expect(out).toContain(
        "0 covered, 1 realized, 0 verified, 1 none (2 specs)",
      );
      expect(out).toContain("SW-002  none");
      expect(out).toContain("Waived (1):");
      expect(out).toContain("SW-001  realized — verified by acceptance");

      const result = JSON.parse(
        await readFile(join(dir, ".clew", "coverage.json"), "utf8"),
      );
      expect(result).toEqual({
        specs: [
          {
            id: "SW-001",
            lens: "SW",
            status: "realized",
            reason: "verified by acceptance",
          },
          { id: "SW-002", lens: "SW", status: "none" },
        ],
        staleWaivers: [],
      });
    });

    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "clew", "coverage", "extra"]),
      ).toThrow();
    });
  });
});

describe("coverage configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("coverage fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-coverage-noconfig-"));
      process.chdir(dir);

      await expect(runClew("coverage")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
