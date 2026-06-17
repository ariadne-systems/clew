import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { init, mint } from "./index.js";

type Fixture = { dir: string; stateFile: string; configFile: string };

// Lays out an artifact tree under <dir>/docs/spec, mirroring the real project:
// stories under stories/, other specs under derived-specs/. Optionally seeds the
// state file so the never-lower and idempotency cases can start from a mark.
async function fixture(
  idFilenames: string[],
  seed?: Record<string, number>,
): Promise<Fixture> {
  const dir = await mkdtemp(join(tmpdir(), "ariadne-init-"));
  for (const name of idFilenames) {
    const sub = name.startsWith("STR-") ? "stories" : "derived-specs";
    const target = join(dir, "docs", "spec", sub);
    await mkdir(target, { recursive: true });
    await writeFile(join(target, name), "x", "utf8");
  }
  const configFile = join(dir, ".ariadnerc.json");
  await writeFile(
    configFile,
    JSON.stringify({ idGeneration: { mode: "sequential", padding: 3 } }),
    "utf8",
  );
  const stateFile = join(dir, ".ariadne", "state.json");
  if (seed) {
    await mkdir(join(dir, ".ariadne"), { recursive: true });
    await writeFile(stateFile, JSON.stringify({ sequences: seed }), "utf8");
  }
  return { dir, stateFile, configFile };
}

async function readMarks(stateFile: string): Promise<Record<string, number>> {
  const state = JSON.parse(await readFile(stateFile, "utf8")) as {
    sequences: Record<string, number>;
  };
  return state.sequences;
}

describe("deriving high-water marks", () => {
  test("records the highest number per prefix from the artifact filenames", async () => {
    const { dir, stateFile } = await fixture([
      "STR-001-a.md",
      "STR-007-b.md",
      "SW-003-c.md",
      "SW-005-d.md",
      "CON-008-e.md",
      "ARCH-002-f.md",
      "NF-002-g.md",
    ]);

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks).toEqual({ STR: 7, SW: 5, CON: 8, ARCH: 2, NF: 2 });
  });

  test("a prefix with no artifacts contributes no mark", async () => {
    const { dir, stateFile } = await fixture(["SW-002-a.md"]);

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks).toEqual({ SW: 2 });
    expect(result.marks.CON).toBeUndefined();
  });

  test("a temporary id filename does not advance a mark", async () => {
    const { dir, stateFile } = await fixture([
      "SW-005-a.md",
      "SW-TMP-abc123.md",
    ]);

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks.SW).toBe(5);
  });

  test("ids under ignored directories such as node_modules are not counted", async () => {
    const { dir, stateFile } = await fixture(["SW-005-a.md"]);
    const ignored = join(dir, "node_modules", "pkg");
    await mkdir(ignored, { recursive: true });
    await writeFile(join(ignored, "SW-999-x.md"), "x", "utf8");

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks.SW).toBe(5);
  });
});

describe("reconciliation", () => {
  test("raises a mark that is below the discovered max", async () => {
    const { dir, stateFile } = await fixture(["SW-005-a.md"], { SW: 3 });

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks.SW).toBe(5);
    expect(result.raised).toEqual([{ prefix: "SW", from: 3, to: 5 }]);
    expect(await readMarks(stateFile)).toEqual({ SW: 5 });
  });

  test("never lowers an existing mark (CON-009)", async () => {
    const { dir, stateFile } = await fixture(["SW-005-a.md"], { SW: 9 });

    const result = await init({ artifactsDir: dir, stateFile });

    expect(result.marks.SW).toBe(9);
    expect(result.raised).toEqual([]);
    expect(await readMarks(stateFile)).toEqual({ SW: 9 });
  });

  test("is idempotent: a second run on an unchanged project changes nothing", async () => {
    const { dir, stateFile } = await fixture(["SW-005-a.md", "STR-007-b.md"]);

    await init({ artifactsDir: dir, stateFile });
    const second = await init({ artifactsDir: dir, stateFile });

    expect(second.raised).toEqual([]);
    expect(second.marks).toEqual({ SW: 5, STR: 7 });
  });
});

describe("init then mint", () => {
  test("a subsequent mint continues after the discovered mark", async () => {
    const { dir, stateFile, configFile } = await fixture(["SW-005-a.md"]);

    await init({ artifactsDir: dir, stateFile });
    const ids = await mint("SW", 1, { configFile, stateFile });

    expect(ids).toEqual(["SW-006"]);
  });
});
