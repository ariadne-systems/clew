import { mkdir, rename, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

/** Suffix of the staging file a write goes to before it is renamed into place. */
export const TEMP_SUFFIX = ".tmp";

/** One file to write: its path and the bytes to put there. */
export interface FileWrite {
  path: string;
  content: string;
}

/**
 * Stages a set of file writes, then commits them by rename. Every file's bytes go
 * to a temporary sibling first; only once all are staged are they renamed into
 * place. A failure while staging removes every temporary — including the one whose
 * write threw — and leaves the targets untouched, so an aborted stage changes
 * nothing. The commit is a sequence of renames, each atomic per file (a reader sees
 * the old file or the whole new one), but it is not rolled back: a rename that fails
 * partway leaves the earlier files committed. Closing that window — all-or-nothing
 * across files — needs a journal and is out of scope.
 */
export async function writeFilesAtomic(
  writes: readonly FileWrite[],
): Promise<void> {
  const staged: { temp: string; path: string }[] = [];
  try {
    for (const write of writes) {
      const temp = `${write.path}${TEMP_SUFFIX}`;
      // Register the temp before writing, so a write that throws mid-flight is
      // still cleaned up.
      staged.push({ temp, path: write.path });
      await mkdir(dirname(write.path), { recursive: true });
      await writeFile(temp, write.content, "utf8");
    }
    for (const entry of staged) {
      await rename(entry.temp, entry.path);
    }
  } catch (error) {
    await Promise.all(staged.map((entry) => rm(entry.temp, { force: true })));
    throw error;
  }
}

/**
 * Writes `content` to `file` atomically: the bytes go to a temporary sibling and
 * are renamed into place, so a reader sees the old file or the whole new one,
 * never a partial write. The temporary is removed if the write fails.
 */
export async function writeFileAtomic(
  file: string,
  content: string,
): Promise<void> {
  await writeFilesAtomic([{ path: file, content }]);
}
