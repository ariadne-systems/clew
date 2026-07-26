import { access, readFile, writeFile } from "node:fs/promises";

/** Whether a path exists. A missing path is `false`; any other error — a permission denial, say — propagates. */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    // ENOENT (nothing there) and ENOTDIR (a path component is a file, so the path
    // cannot resolve) both mean "does not exist"; a genuine error (a permission
    // denial, say) still propagates rather than reading as absent.
    const code = (error as NodeJS.ErrnoException).code;
    if (code === "ENOENT" || code === "ENOTDIR") {
      return false;
    }
    throw error;
  }
}

/** Reads a file, treating a missing one as absent (`null`); any other error propagates. */
export async function readFileOrNull(path: string): Promise<string | null> {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Reads a file, treating a missing one as empty. */
export async function readFileOrEmpty(path: string): Promise<string> {
  return (await readFileOrNull(path)) ?? "";
}

/** Writes `content` to `path` only when it does not exist (`wx`); returns whether it wrote. */
export async function writeIfAbsent(
  path: string,
  content: string,
): Promise<boolean> {
  try {
    await writeFile(path, content, { encoding: "utf8", flag: "wx" });
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") {
      return false;
    }
    throw error;
  }
}
