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

async function runAriadne(...args: string[]): Promise<void> {
  await buildProgram().parseAsync(["node", "ariadne", ...args]);
}

describe("setup output", () => {
  verifies(SwTraceables.SW_010_SETUP_COMMAND, () => {
    test("scaffolds the config and layout, and reports what it created", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-setup-"));
      process.chdir(dir);
      const stdout = captureStdout();

      await runAriadne("setup");

      expect(existsSync(join(dir, ".ariadnerc.json"))).toBe(true);
      expect(existsSync(join(dir, "docs", "spec", "stories"))).toBe(true);
      expect(stdout()).toMatch(/Created .*\.ariadnerc\.json/);
    });

    test("a second run reports the configuration already exists and changes nothing", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-setup-"));
      process.chdir(dir);
      const stdout = captureStdout();

      await runAriadne("setup");
      await runAriadne("setup");

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

      expect(() =>
        program.parse(["node", "ariadne", "setup", "extra"]),
      ).toThrow();
    });

    test("an unknown option exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "setup", "--bogus"]),
      ).toThrow();
    });
  });
});
