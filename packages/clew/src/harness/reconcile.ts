import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { METHOD_MARKER } from "./harness.js";

/** The marker line at the start of any line, together with the blank line after it — how `mark` inserts it and `unmarked` removes it. */
const MARKER_LINE = new RegExp(`^<!-- ${METHOD_MARKER}[^\\n]*-->\\n\\n`, "m");

/** The marker a tool-emitted method file carries: the tool tag, a content hash, and a note that edits are the project's to keep. */
export function methodMarker(contentHash: string): string {
  return `<!-- ${METHOD_MARKER} · sha256:${contentHash} · safe to edit; a re-run updates this file only while it is unedited. -->`;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/** The offset just past a leading YAML frontmatter block, so the marker lands after it — the frontmatter must stay at line 1; 0 when there is none. */
function afterFrontmatter(content: string): number {
  const frontmatter = content.match(/^---\n[\s\S]*?\n---\n/);
  return frontmatter === null ? 0 : frontmatter[0].length;
}

/** Inserts the marker — carrying the hash of the whole content — after any frontmatter, so the frontmatter stays at the top. */
function mark(content: string): string {
  const offset = afterFrontmatter(content);
  const marker = `${methodMarker(sha256(content))}\n\n`;
  return content.slice(0, offset) + marker + content.slice(offset);
}

/** The content with its marker removed — the exact form the recorded hash was taken over — or null when it carries no clew marker. */
function unmarked(contents: string): string | null {
  return MARKER_LINE.test(contents) ? contents.replace(MARKER_LINE, "") : null;
}

/** The hash the marker records; null for a pre-hash marker an older setup wrote; undefined when there is no clew marker at all. */
function recordedHash(contents: string): string | null | undefined {
  const marker = contents.match(
    new RegExp(`^<!-- ${METHOD_MARKER}[^\\n]*-->`, "m"),
  );
  if (marker === null) {
    return undefined;
  }
  return marker[0].match(/sha256:([0-9a-f]{64})/)?.[1] ?? null;
}

/** Whether reconciling wrote the tool's version or deferred to the project's edit. */
export type ReconcileOutcome = "written" | "preserved";

/**
 * Writes the tool's current version of a method file, but only when the file on
 * disk is absent or still pristine — its content (marker removed) matches the hash
 * the tool last recorded. A file the project has edited, or one whose marker it has
 * removed, is left untouched, so a re-run advances the method without ever
 * discarding a customization. The marker is placed after any YAML frontmatter, so
 * a skill's frontmatter stays at line 1.
 */
export async function reconcileMethodFile(
  absolutePath: string,
  content: string,
): Promise<ReconcileOutcome> {
  const marked = mark(content);
  const existing = await readIfPresent(absolutePath);
  if (existing === null) {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, marked, "utf8");
    return "written";
  }
  const hash = recordedHash(existing);
  if (hash === undefined) {
    return "preserved";
  }
  // A pre-hash marker (older setup) carries no recorded hash; adopt the current
  // scheme by rewriting it. A hashed marker is rewritten only while still pristine.
  if (hash !== null) {
    const original = unmarked(existing);
    if (original === null || sha256(original) !== hash) {
      return "preserved";
    }
  }
  await writeFile(absolutePath, marked, "utf8");
  return "written";
}

async function readIfPresent(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
