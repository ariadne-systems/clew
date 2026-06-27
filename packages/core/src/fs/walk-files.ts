import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** A file found by `walkFiles`: its absolute path and base name. */
export interface WalkedFile {
  path: string;
  name: string;
}

/**
 * Recursively lists the files (not directories) under `dir`, treating a missing
 * directory as empty. The single recursive directory walk used wherever a tree of
 * drafts or specs is scanned.
 */
export async function walkFiles(dir: string): Promise<WalkedFile[]> {
  const files: WalkedFile[] = [];
  await walk(dir);
  return files;

  async function walk(current: string): Promise<void> {
    let entries: Dirent[];
    try {
      entries = await readdir(current, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else {
        files.push({ path: full, name: entry.name });
      }
    }
  }
}
