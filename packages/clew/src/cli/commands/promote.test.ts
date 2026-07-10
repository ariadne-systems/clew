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

// Creates an isolated project with a draft under the default drafts location and
// switches into it, so `promote` finalizes locally with the default layout.
async function setupProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-cli-promote-"));
  await writeFile(join(dir, ".clewrc.json"), JSON.stringify({}), "utf8");
  const draftsDir = join(dir, "docs", "spec", "drafts", "derived-specs");
  await mkdir(draftsDir, { recursive: true });
  await writeFile(
    join(draftsDir, "SW-TMP-deadbeef01-scan.md"),
    "Spec SW-TMP-deadbeef01\n",
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

describe("promote output", () => {
  verifies(SwTraceables.SW_016_PROMOTE_COMMAND, () => {
    test("finalizes a pending draft and reports the binding", async () => {
      const dir = await setupProjectDir();
      const stdout = captureStdout();

      await runClew("promote", "all");

      expect(stdout()).toContain("SW-TMP-deadbeef01 -> SW-001");
      const moved = await readFile(
        join(dir, "docs", "spec", "derived-specs", "SW-001-scan.md"),
        "utf8",
      );
      expect(moved).toBe("Spec SW-001\n");
    });

    test("reports when there is nothing to promote", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-promote-empty-"));
      await writeFile(join(dir, ".clewrc.json"), JSON.stringify({}), "utf8");
      process.chdir(dir);
      const stdout = captureStdout();

      await runClew("promote", "all");

      expect(stdout()).toContain("No pending drafts to promote.");
    });
  });
});

describe("promote invalid invocation", () => {
  verifies(
    [
      SwTraceables.SW_016_PROMOTE_COMMAND,
      ConTraceables.CON_028_PROMOTION_ROOTED_AT_NAMED_DRAFTS,
    ],
    () => {
      test("an unknown option exits non-zero", () => {
        const program = buildProgram().exitOverride();

        expect(() =>
          program.parse(["node", "clew", "promote", "--bogus"]),
        ).toThrow();
      });

      test("no named root exits non-zero", () => {
        const program = buildProgram().exitOverride();

        expect(() => program.parse(["node", "clew", "promote"])).toThrow();
      });
    },
  );
});

describe("configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("promote fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-promote-noconfig-"));
      process.chdir(dir);

      await expect(runClew("promote", "all")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
