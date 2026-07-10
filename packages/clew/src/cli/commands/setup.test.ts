import { existsSync } from "node:fs";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { SwTraceables, verifies } from "@ariadne-thread/trace";
import { afterEach, describe, expect, test, vi } from "vitest";
import { buildProgram } from "../program.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
});

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

describe("setup output", () => {
  verifies(SwTraceables.SW_010_SETUP_COMMAND, () => {
    test("scaffolds the config and layout, and reports what it created", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-setup-"));
      process.chdir(dir);
      const stdout = captureStdout();

      await runClew("setup");

      expect(existsSync(join(dir, ".clewrc.json"))).toBe(true);
      expect(existsSync(join(dir, "docs", "spec", "stories"))).toBe(true);
      expect(stdout()).toMatch(/Created .*\.clewrc\.json/);
    });

    test("a second run reports the configuration already exists and changes nothing", async () => {
      const dir = await mkdtemp(join(tmpdir(), "clew-cli-setup-"));
      process.chdir(dir);
      const stdout = captureStdout();

      await runClew("setup");
      await runClew("setup");

      const out = stdout();
      expect(out).toMatch(/Created/);
      expect(out).toMatch(/already exists/);
    });
  });
});

describe("setup invalid invocation", () => {
  verifies(SwTraceables.SW_010_SETUP_COMMAND, () => {
    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() => program.parse(["node", "clew", "setup", "extra"])).toThrow();
    });

    test("an unknown option exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "clew", "setup", "--bogus"]),
      ).toThrow();
    });
  });
});
