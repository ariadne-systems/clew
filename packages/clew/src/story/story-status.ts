import { join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import { readLayout } from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import { readFileOrNull } from "../fs/files.js";
import { walkFiles } from "../fs/walk-files.js";

/**
 * The states a story's implementation status may take. Unlike a spec's, a story
 * carries the terminal `done` and `dropped`: a story is never a traceable, so it
 * has no coverage to signal completion and no `deprecated` generation to retire.
 */
export const STORY_STATUSES = ["planned", "active", "done", "dropped"] as const;
export type StoryStatus = (typeof STORY_STATUSES)[number];

/** A story and its declared implementation status. */
export interface StoryState {
  /** The story's filename, its id and slug. */
  readonly file: string;
  readonly status: StoryStatus;
}

const STATUS_FIELD = /^\*\*Status\*\*:[ \t]*(.+?)[ \t]*$/m;

/**
 * Reads a story's implementation state from its `**Status**` field: the declared
 * value, or `planned` when the field is absent. An unrecognized value is
 * rejected, so a typo cannot misreport whether a story is done.
 */
export const readStoryStatus: (
  content: string,
  location: string,
) => StoryStatus = realizes(
  ConTraceables.CON_041_STORY_STATUS_TERMINAL_STATES,
  (content: string, location: string): StoryStatus => {
    const value = STATUS_FIELD.exec(content)?.[1];
    if (value === undefined) {
      return "planned";
    }
    if (!(STORY_STATUSES as readonly string[]).includes(value)) {
      throw new ClewError(
        ErrorCode.INVALID_STORY_STATUS,
        `unrecognized story status "${value}"`,
        {
          location,
          note: "a story's **Status** must be a recognized state, or its implementation state would be misreported",
          help: [
            `set **Status** to one of ${STORY_STATUSES.join(", ")}, or remove it to default to planned`,
            "run `clew status` to list every story's state",
          ],
        },
      );
    }
    return value as StoryStatus;
  },
);

export type ReadStoryStatusesOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the stories location is resolved against. Defaults to the process cwd. */
  projectRoot?: string;
};

/**
 * Reads each story in the configured stories location with its declared status —
 * a read of its own over the stories location, not the traceable scan (which
 * skips non-lens prefixes). Results are sorted by filename for a stable listing.
 */
export const readStoryStatuses: (
  options?: ReadStoryStatusesOptions,
) => Promise<StoryState[]> = realizes(
  SwTraceables.SW_049_READ_STORY_STATUS,
  async (options: ReadStoryStatusesOptions = {}): Promise<StoryState[]> => {
    const layout = await readLayout(options.configFile);
    const storiesDir = join(options.projectRoot ?? ".", layout.stories.dir);
    const states: StoryState[] = [];
    for (const file of await walkFiles(storiesDir)) {
      if (!file.name.endsWith(".md")) {
        continue;
      }
      const content = await readFileOrNull(file.path);
      if (content !== null) {
        states.push({
          file: file.name,
          status: readStoryStatus(content, file.path),
        });
      }
    }
    states.sort((left, right) => left.file.localeCompare(right.file));
    return states;
  },
);
