import { execFile } from "node:child_process";
import { resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/** The project-relative paths in a `-z` (null-separated, unquoted) git output. */
function paths(stdout: string): string[] {
  return stdout.split("\0").filter((path) => path !== "");
}

/**
 * The version-control state to record when scanning: the current commit and the
 * tracked files dirty against it. Both are needed to compute a later change set —
 * the commit for `git diff`, and the dirty set because a file edited at scan time
 * and later reverted to its committed content would otherwise not appear in that
 * diff. Returns `null` when incremental scanning is not safe here: not a git
 * repository, git unavailable, no commit, or the project root is not the
 * repository root (git reports repository-relative paths, anchors are
 * project-relative, so the two align only when the roots coincide). Every such
 * case collapses to `null`, the caller's signal to fall back to a full scan.
 */
export async function scanState(
  cwd: string,
): Promise<{ head: string; dirty: readonly string[] } | null> {
  try {
    const [head, top, dirty] = await Promise.all([
      run("git", ["rev-parse", "HEAD"], { cwd }),
      run("git", ["rev-parse", "--show-toplevel"], { cwd }),
      run("git", ["diff", "--name-only", "-z", "HEAD", "--"], { cwd }),
    ]);
    if (resolve(top.stdout.trim()) !== resolve(cwd)) {
      return null;
    }
    const headSha = head.stdout.trim();
    return headSha === ""
      ? null
      : { head: headSha, dirty: paths(dirty.stdout) };
  } catch {
    return null;
  }
}

/**
 * The project-relative paths that differ from `sha` in the working tree — tracked
 * changes since that commit (`git diff`, committed and uncommitted, including
 * deletions) plus new untracked files (`git ls-files --others`, honouring
 * `.gitignore`). Both use `-z` so a filename with a space or non-ASCII character
 * is returned verbatim, not git-quoted. This over-approximates changes since
 * `sha` was scanned: a file already dirty at scan time is included though
 * unchanged since, which is harmless (rescanning it yields the same anchors).
 * Returns `null` on any git failure — an unknown `sha`, git unavailable —
 * signalling a full-scan fallback.
 */
export async function changedSince(
  sha: string,
  cwd: string,
): Promise<Set<string> | null> {
  try {
    const [tracked, untracked] = await Promise.all([
      run("git", ["diff", "--name-only", "-z", sha, "--"], { cwd }),
      run("git", ["ls-files", "--others", "--exclude-standard", "-z", "--"], {
        cwd,
      }),
    ]);
    return new Set([...paths(tracked.stdout), ...paths(untracked.stdout)]);
  } catch {
    return null;
  }
}
