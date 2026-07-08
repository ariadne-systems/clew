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

// Creates an isolated project with an artifact tree under docs/spec and switches
// into it, so `init` discovers ids there and writes .ariadne/state.json locally.
async function setupProjectDir(idFilenames: string[]): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-init-"));
  await writeFile(
    join(dir, ".ariadnerc.json"),
    JSON.stringify({ idGeneration: { mode: "sequential", padding: 3 } }),
    "utf8",
  );
  const specDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(specDir, { recursive: true });
  for (const name of idFilenames) {
    await writeFile(join(specDir, name), "x", "utf8");
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

describe("init output", () => {
  verifies(SwTraceables.SW_007_INIT_COMMAND, () => {
    test("records discovered marks and reports each raised prefix to stdout", async () => {
      const dir = await setupProjectDir(["SW-005-a.md", "CON-008-b.md"]);
      const stdout = captureStdout();

      await runAriadne("init");

      expect(stdout()).toContain("CON: 0 -> 8");
      expect(stdout()).toContain("SW: 0 -> 5");
      const state = JSON.parse(
        await readFile(join(dir, ".ariadne", "state.json"), "utf8"),
      ) as { sequences: Record<string, number> };
      expect(state.sequences).toEqual({ SW: 5, CON: 8 });
    });

    test("a second run changes nothing and reports it", async () => {
      const dir = await setupProjectDir(["SW-005-a.md"]);
      const first = captureStdout();
      await runAriadne("init");
      expect(first()).toContain("SW: 0 -> 5");

      vi.restoreAllMocks();
      const second = captureStdout();
      await runAriadne("init");

      expect(second()).toContain("nothing changed");
      const state = JSON.parse(
        await readFile(join(dir, ".ariadne", "state.json"), "utf8"),
      ) as { sequences: Record<string, number> };
      expect(state.sequences).toEqual({ SW: 5 });
    });
  });
});

describe("init invalid invocation", () => {
  verifies(SwTraceables.SW_007_INIT_COMMAND, () => {
    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "init", "extra"]),
      ).toThrow();
    });

    test("an unknown option exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "init", "--bogus"]),
      ).toThrow();
    });
  });
});

describe("configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("init fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-init-noconfig-"));
      process.chdir(dir);

      await expect(runAriadne("init")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});
