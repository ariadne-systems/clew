import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { METHOD_MARKER } from "./harness.js";

/** Separates the marker line from the body it protects. */
const MARKER_SEPARATOR = "\n\n";

/** The marker a tool-emitted method file carries: the tool tag, a content hash of the body, and a note that edits are the project's to keep. */
export function methodMarker(bodyHash: string): string {
  return `<!-- ${METHOD_MARKER} · sha256:${bodyHash} · safe to edit; a re-run updates this file only while it is unedited. -->`;
}

function sha256(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * The leading clew marker: the body it covers and its recorded hash — null for a
 * pre-hash marker an older setup wrote. The whole result is null when the file
 * carries no clew marker at all, i.e. it is the project's own file.
 */
function parseMarker(
  contents: string,
): { hash: string | null; body: string } | null {
  const separatorIndex = contents.indexOf(MARKER_SEPARATOR);
  if (separatorIndex === -1) {
    return null;
  }
  const marker = contents.slice(0, separatorIndex);
  if (!marker.startsWith("<!--") || !marker.includes(METHOD_MARKER)) {
    return null;
  }
  return {
    hash: marker.match(/sha256:([0-9a-f]{64})/)?.[1] ?? null,
    body: contents.slice(separatorIndex + MARKER_SEPARATOR.length),
  };
}

/** Whether reconciling wrote the tool's version or deferred to the project's edit. */
export type ReconcileOutcome = "written" | "preserved";

/**
 * Writes the tool's current version of a method file, but only when the file on
 * disk is absent or still pristine — its body matches the hash the tool last
 * recorded. A file the project has edited, or one whose marker it has removed, is
 * left untouched, so a re-run advances the method without ever discarding a
 * customization.
 */
export async function reconcileMethodFile(
  absolutePath: string,
  body: string,
): Promise<ReconcileOutcome> {
  const marked = `${methodMarker(sha256(body))}${MARKER_SEPARATOR}${body}`;
  const existing = await readIfPresent(absolutePath);
  if (existing === null) {
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, marked, "utf8");
    return "written";
  }
  const parsed = parseMarker(existing);
  if (parsed === null) {
    return "preserved";
  }
  // A pre-hash marker (older setup) carries no recorded hash; adopt the current
  // scheme by rewriting it. A hashed marker is rewritten only while still pristine.
  if (parsed.hash !== null && sha256(parsed.body) !== parsed.hash) {
    return "preserved";
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
