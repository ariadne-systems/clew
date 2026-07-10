import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { afterEach, describe, expect, test, vi } from "vitest";
import { ErrorCode } from "../../index.js";
import { buildProgram } from "../program.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  process.exitCode = 0;
  vi.restoreAllMocks();
});

// Creates an isolated project (default layout) and switches into it, so `check`
// runs against the local corpus.
async function setupProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-cli-check-"));
  await writeFile(join(dir, ".clewrc.json"), JSON.stringify({}), "utf8");
  await mkdir(join(dir, "docs", "spec", "specs"), { recursive: true });
  await mkdir(join(dir, "docs", "spec", "stories"), { recursive: true });
  process.chdir(dir);
  return dir;
}

function captureStream(stream: "stdout" | "stderr"): () => string {
  const chunks: string[] = [];
  vi.spyOn(process[stream], "write").mockImplementation((chunk): boolean => {
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

describe("check output", () => {
  verifies(SwTraceables.SW_034_CHECK_COMMAND, () => {
    test("a clean corpus reports OK and exits zero", async () => {
      await setupProjectDir();
      const stdout = captureStream("stdout");

      await runClew("check");

      expect(stdout()).toContain("check: OK");
      expect(process.exitCode ?? 0).toBe(0);
    });

    test("a dangling link is reported to stderr and exits non-zero", async () => {
      const dir = await setupProjectDir();
      await writeFile(
        join(dir, "docs", "spec", "specs", "SW-001-a.md"),
        "See [gone](SW-099-missing.md).\n",
        "utf8",
      );
      const stderr = captureStream("stderr");

      await runClew("check");

      expect(stderr()).toContain("reference-rot");
      expect(process.exitCode).toBe(1);
    });
  });
});

describe("configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("check fails with E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-check-noconfig-"));
      process.chdir(dir);

      await expect(runClew("check")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
