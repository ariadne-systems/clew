import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
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

async function projectWithStories(
  stories: Record<string, string>,
): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "clew-cli-status-"));
  await writeFile(join(dir, ".clewrc.json"), JSON.stringify({}), "utf8");
  const storiesDir = join(dir, "docs", "spec", "stories");
  await mkdir(storiesDir, { recursive: true });
  for (const [name, content] of Object.entries(stories)) {
    await writeFile(join(storiesDir, name), content, "utf8");
  }
  return dir;
}

describe("status command", () => {
  verifies(SwTraceables.SW_050_STATUS_COMMAND, () => {
    test("lists each story with its status; a story with no Status shows as planned", async () => {
      const dir = await projectWithStories({
        "STR-1-first.md": "**Title**\nx\n\n**Status**: active\n",
        "STR-2-second.md": "**Title**\nx\n",
      });
      process.chdir(dir);
      const stdout = captureStdout();

      await runClew("status");

      const out = stdout();
      expect(out).toMatch(/active\s+STR-1-first\.md/);
      expect(out).toMatch(/planned\s+STR-2-second\.md/);
    });

    test("reports when there are no stories", async () => {
      const dir = await projectWithStories({});
      process.chdir(dir);
      const stdout = captureStdout();

      await runClew("status");

      expect(stdout()).toMatch(/No stories found/);
    });
  });
});
