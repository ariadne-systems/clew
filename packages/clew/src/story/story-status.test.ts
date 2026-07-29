import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ErrorCode } from "../errors.js";
import { readStoryStatus, readStoryStatuses } from "./story-status.js";

/** Writes a temporary project with a default config and the given story files. */
async function project(
  stories: Record<string, string>,
): Promise<{ root: string; configFile: string }> {
  const root = await mkdtemp(join(tmpdir(), "clew-story-"));
  const configFile = join(root, ".clewrc.json");
  await writeFile(configFile, JSON.stringify({}), "utf8");
  const storiesDir = join(root, "docs", "spec", "stories");
  await mkdir(storiesDir, { recursive: true });
  for (const [name, content] of Object.entries(stories)) {
    await writeFile(join(storiesDir, name), content, "utf8");
  }
  return { root, configFile };
}

describe("story status value set", () => {
  verifies(ConTraceables.CON_041_STORY_STATUS_TERMINAL_STATES, () => {
    test("accepts each declared value, and an absent field as planned", () => {
      expect(readStoryStatus("**Status**: planned", "s")).toBe("planned");
      expect(readStoryStatus("**Status**: active", "s")).toBe("active");
      expect(readStoryStatus("**Status**: done", "s")).toBe("done");
      expect(readStoryStatus("**Status**: dropped", "s")).toBe("dropped");
      expect(readStoryStatus("**Title**\nno status field\n", "s")).toBe(
        "planned",
      );
    });

    test("rejects an unrecognized value", () => {
      let error: unknown;
      try {
        readStoryStatus("**Status**: finished", "STR-9-x.md");
      } catch (caught) {
        error = caught;
      }
      expect(error).toMatchObject({ code: ErrorCode.INVALID_STORY_STATUS });
    });
  });
});

describe("reading story statuses", () => {
  verifies(SwTraceables.SW_049_READ_STORY_STATUS, () => {
    test("reads each story's status, absent as planned, sorted by filename", async () => {
      const { root, configFile } = await project({
        "STR-2-second.md": "**Title**\nx\n\n**Status**: done\n",
        "STR-1-first.md": "**Title**\nx\n\n**Status**: active\n",
        "STR-3-third.md": "**Title**\nx\n",
      });

      const states = await readStoryStatuses({ configFile, projectRoot: root });

      expect(states).toEqual([
        { file: "STR-1-first.md", status: "active" },
        { file: "STR-2-second.md", status: "done" },
        { file: "STR-3-third.md", status: "planned" },
      ]);
    });

    test("rejects a story whose status is unrecognized", async () => {
      const { root, configFile } = await project({
        "STR-1-bad.md": "**Title**\nx\n\n**Status**: shipped\n",
      });

      await expect(
        readStoryStatuses({ configFile, projectRoot: root }),
      ).rejects.toMatchObject({ code: ErrorCode.INVALID_STORY_STATUS });
    });
  });
});
