import { existsSync } from "node:fs";
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, test, vi } from "vitest";
import { buildProgram } from "../program.js";

const originalCwd = process.cwd();

afterEach(() => {
  process.chdir(originalCwd);
  vi.restoreAllMocks();
});

// Creates an isolated project directory with a known config and switches into
// it, so the mint command's core defaults (.ariadnerc.json, .ariadne/state.json)
// resolve there rather than against the repository.
async function setupProjectDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-mint-"));
  await writeFile(
    join(dir, ".ariadnerc.json"),
    JSON.stringify({
      idToken: { pattern: "[A-Z]{2,4}-[0-9]{3}" },
      idGeneration: { mode: "sequential", padding: 3 },
    }),
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

describe("output", () => {
  test("mint with no count prints one id to stdout", async () => {
    await setupProjectDir();
    const stdout = captureStdout();

    await runAriadne("mint", "SW");

    expect(stdout()).toBe("SW-001\n");
  });

  test("mint with a count prints that many ids, one per line, in order", async () => {
    await setupProjectDir();
    const stdout = captureStdout();

    await runAriadne("mint", "SW", "3");

    expect(stdout()).toBe("SW-001\nSW-002\nSW-003\n");
  });
});

describe("invalid input", () => {
  test("an invalid count fails and writes no id to stdout", async () => {
    await setupProjectDir();
    const stdout = captureStdout();

    await expect(runAriadne("mint", "SW", "0")).rejects.toThrow();

    expect(stdout()).toBe("");
  });

  test("a non-numeric count is rejected with a specific error", async () => {
    await setupProjectDir();
    const stdout = captureStdout();

    await expect(runAriadne("mint", "SW", "abc")).rejects.toThrow(
      /count must be a whole number/i,
    );

    expect(stdout()).toBe("");
  });

  test("a malformed type is rejected and nothing is minted", async () => {
    const dir = await setupProjectDir();
    const stdout = captureStdout();

    await expect(runAriadne("mint", "sw")).rejects.toThrow();

    expect(stdout()).toBe("");
    expect(existsSync(join(dir, ".ariadne", "state.json"))).toBe(false);
  });
});
