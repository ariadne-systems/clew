import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
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

// Creates an isolated project with the given configuration and switches into it,
// so `config` resolves against it.
async function setupProjectDir(config: unknown): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-config-"));
  await writeFile(join(dir, ".ariadnerc.json"), JSON.stringify(config), "utf8");
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

// The recursive file listing of a directory, sorted, as a snapshot of its state.
async function listFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { recursive: true });
  return entries.sort();
}

describe("config output", () => {
  verifies(SwTraceables.SW_020_CONFIG_COMMAND, () => {
    test("prints the resolved lenses, prefixes, layout, and generators with resolved output directories", async () => {
      await setupProjectDir({ generators: [{ type: "typescript" }] });
      const stdout = captureStdout();

      await runAriadne("config");

      const output = stdout();
      expect(output).toContain("SW:");
      expect(output).toContain("Prefixes:");
      expect(output).toContain("docs/spec/stories");
      // No `outputDir` configured, so the typescript generator's own default shows.
      expect(output).toContain("typescript -> src/ariadne/traceables");
    });

    test("--json prints the same resolved view as machine-readable JSON", async () => {
      await setupProjectDir({
        generators: [{ type: "typescript", outputDir: "out-ts" }],
      });
      const stdout = captureStdout();

      await runAriadne("config", "--json");

      const view = JSON.parse(stdout());
      expect(view.lenses).toEqual(
        expect.arrayContaining([expect.objectContaining({ id: "SW" })]),
      );
      expect(view.prefixes).toEqual(expect.arrayContaining(["SW", "STR"]));
      expect(view.layout.stories.dir).toBe("docs/spec/stories");
      expect(view.generators).toEqual([
        { type: "typescript", outputDir: "out-ts" },
      ]);
    });
  });
});

describe("config invalid invocation", () => {
  verifies(SwTraceables.SW_020_CONFIG_COMMAND, () => {
    test("an extra positional argument exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "config", "extra"]),
      ).toThrow();
    });

    test("an unknown option exits non-zero", () => {
      const program = buildProgram().exitOverride();

      expect(() =>
        program.parse(["node", "ariadne", "config", "--bogus"]),
      ).toThrow();
    });
  });
});

describe("configuration required", () => {
  verifies(ConTraceables.CON_011_COMMAND_REQUIRES_CONFIG, () => {
    test("config fails with code E_NO_CONFIG when no configuration is present", async () => {
      const dir = await mkdtemp(join(tmpdir(), "ariadne-cli-config-noconfig-"));
      process.chdir(dir);

      await expect(runAriadne("config")).rejects.toMatchObject({
        code: ErrorCode.NO_CONFIG,
      });
    });
  });
});

describe("config is read-only", () => {
  verifies(ConTraceables.CON_015_CONFIG_READ_ONLY, () => {
    test("running the command changes no file and creates nothing", async () => {
      const dir = await setupProjectDir({
        generators: [{ type: "typescript", outputDir: "out-ts" }],
      });
      const filesBefore = await listFiles(dir);
      const configBefore = await readFile(join(dir, ".ariadnerc.json"), "utf8");

      captureStdout();
      await runAriadne("config");
      vi.restoreAllMocks();
      captureStdout();
      await runAriadne("config", "--json");

      expect(await listFiles(dir)).toEqual(filesBefore);
      expect(await readFile(join(dir, ".ariadnerc.json"), "utf8")).toBe(
        configBefore,
      );
    });
  });
});
