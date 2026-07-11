import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { writeFileAtomic, writeFilesAtomic } from "./atomic-write.js";

async function tempDir(): Promise<string> {
  return mkdtemp(join(tmpdir(), "clew-atomic-"));
}

describe("atomic file writes", () => {
  test("writeFileAtomic writes the content and leaves no temporary", async () => {
    const dir = await tempDir();
    const file = join(dir, "out.json");

    await writeFileAtomic(file, "hello\n");

    expect(await readFile(file, "utf8")).toBe("hello\n");
    expect(await readdir(dir)).toEqual(["out.json"]);
  });

  test("writeFileAtomic removes its temporary when the write fails", async () => {
    const dir = await tempDir();
    const blocker = join(dir, "blocker");
    await writeFile(blocker, "x", "utf8");
    // The target's parent is a file, so the write fails after the temp is registered.
    const target = join(blocker, "nested", "out.txt");

    await expect(writeFileAtomic(target, "A")).rejects.toThrow();

    const entries = await readdir(dir, { recursive: true });
    expect(entries.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  test("writeFilesAtomic commits every file, creating missing directories", async () => {
    const dir = await tempDir();
    const a = join(dir, "a.txt");
    const b = join(dir, "sub", "b.txt");

    await writeFilesAtomic([
      { path: a, content: "A" },
      { path: b, content: "B" },
    ]);

    expect(await readFile(a, "utf8")).toBe("A");
    expect(await readFile(b, "utf8")).toBe("B");
  });

  test("a failed staging write commits nothing and leaves no temporary behind", async () => {
    const dir = await tempDir();
    const good = join(dir, "good.txt");
    // A plain file where a directory is expected makes the second write throw
    // (mkdir under a file fails) before anything has been committed.
    const blocker = join(dir, "blocker");
    await writeFile(blocker, "x", "utf8");
    const bad = join(blocker, "nested", "b.txt");

    await expect(
      writeFilesAtomic([
        { path: good, content: "A" },
        { path: bad, content: "B" },
      ]),
    ).rejects.toThrow();

    // The first file was staged but never renamed into place.
    await expect(readFile(good, "utf8")).rejects.toThrow();
    const entries = await readdir(dir, { recursive: true });
    expect(entries.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
