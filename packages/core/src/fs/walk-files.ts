import type { Dirent } from "node:fs";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

/** A file found by `walkFiles`: its absolute path and base name. */
export interface WalkedFile {
  path: string;
  name: string;
}

/** A directory-descent and file-acceptance policy for `walkProject`. */
export interface WalkPolicy {
  /** Whether to descend into a directory, by its project-root-relative forward-slash path. */
  descend: (relativeDir: string) => boolean;
  /** Whether to include a file, by its project-root-relative forward-slash path. */
  accept: (relativePath: string) => boolean;
}

/**
 * Walks `projectRoot`, returning the project-root-relative, forward-slash paths of
 * the files `policy.accept` admits, descending only where `policy.descend` allows.
 * A missing root is treated as empty. This is the single, policy-driven project walk
 * the code scan and the integrity checks share, so they never differ on what the
 * project's source is; the exclusion semantics live in the policy the caller passes,
 * not in the walk.
 */
export async function walkProject(
  projectRoot: string,
  policy: WalkPolicy,
): Promise<string[]> {
  const files: string[] = [];
  await walk("");
  return files;

  async function walk(relativeDir: string): Promise<void> {
    const absoluteDir =
      relativeDir === "" ? projectRoot : join(projectRoot, relativeDir);
    let entries: Dirent[];
    try {
      entries = await readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return;
      }
      throw error;
    }
    for (const entry of entries) {
      const relativeChild =
        relativeDir === "" ? entry.name : `${relativeDir}/${entry.name}`;
      if (entry.isDirectory()) {
        if (policy.descend(relativeChild)) {
          await walk(relativeChild);
        }
      } else if (entry.isFile() && policy.accept(relativeChild)) {
        files.push(relativeChild);
      }
    }
  }
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
