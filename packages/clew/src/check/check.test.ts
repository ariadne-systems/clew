import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  ArchTraceables,
  ConTraceables,
  SwTraceables,
  SysTraceables,
  verifies,
} from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import {
  check,
  classifyCFamily,
  type Finding,
  type Generator,
} from "../index.js";

type Project = {
  configFile: string;
  root: string;
  storiesDir: string;
  derivedDir: string;
};

// A minimal TypeScript-like generator: the comment check selects `.ts` files and
// reads their comments through its `findComments`, backed by the shared C-family lexer.
const tsGenerator: Generator = {
  name: "typescript",
  defaultOutputDir: "out",
  sourceExtensions: [
    ".ts",
    ".tsx",
    ".mts",
    ".cts",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
  ],
  generate: () => Promise.resolve([]),
  discover: () => [],
  readTraceables: () => [],
  findComments: (content) =>
    classifyCFamily(content, {
      templates: true,
      regex: true,
      textBlocks: false,
    }).comments,
};

const resolveGenerator = (name: string): Generator | undefined =>
  name === "typescript" ? tsGenerator : undefined;

// Lays out an empty spec corpus (stories, derived specs) with a config whose
// layout points at those directories, so `check` reads its locations from
// configuration.
async function project(
  extraConfig: Record<string, unknown> = {},
): Promise<Project> {
  const dir = await mkdtemp(join(tmpdir(), "clew-check-"));
  const storiesDir = join(dir, "docs", "spec", "stories");
  const derivedDir = join(dir, "docs", "spec", "derived-specs");
  await mkdir(storiesDir, { recursive: true });
  await mkdir(derivedDir, { recursive: true });
  await writeFile(
    join(dir, ".clewrc.json"),
    JSON.stringify({
      layout: {
        stories: { dir: storiesDir, prefix: "STR" },
        derivedSpecs: { dir: derivedDir },
        drafts: { dir: join(dir, "docs", "spec", "drafts") },
      },
      generators: [{ type: "typescript", outputDir: "out" }],
      ...extraConfig,
    }),
    "utf8",
  );
  return {
    configFile: join(dir, ".clewrc.json"),
    root: dir,
    storiesDir,
    derivedDir,
  };
}

describe("the check suite", () => {
  verifies(
    [
      ArchTraceables.ARCH_005_CHECKS_ARE_ONE_SUITE,
      ConTraceables.CON_029_RELATION_LINK_RESOLVES,
    ],
    () => {
      test("a clean corpus yields no findings", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [SW-002 — b](SW-002-b.md).\n",
          "utf8",
        );
        await writeFile(join(p.derivedDir, "SW-002-b.md"), "Spec b\n", "utf8");

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(result.findings).toEqual([]);
      });

      test("a link to a non-existent spec is reported by reference-rot", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "Line one.\nSee [SW-099 — gone](SW-099-missing.md).\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(result.findings).toEqual([
          {
            check: "reference-rot",
            file: "docs/spec/derived-specs/SW-001-a.md",
            line: 2,
            message: 'link to "SW-099-missing.md" resolves to nothing',
          },
        ]);
      });

      test("a link from a story across the layout resolves", async () => {
        const p = await project();
        await writeFile(
          join(p.storiesDir, "STR-001-x.md"),
          "Realizes [SW-001 — a](../derived-specs/SW-001-a.md).\n",
          "utf8",
        );
        await writeFile(join(p.derivedDir, "SW-001-a.md"), "Spec a\n", "utf8");

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(result.findings).toEqual([]);
      });

      test("a link to a heading that does not exist is reported", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [the rule](SW-002-b.md#no-such-heading).\n",
          "utf8",
        );
        await writeFile(
          join(p.derivedDir, "SW-002-b.md"),
          "## A Real Heading\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(result.findings.map((finding) => finding.message)).toEqual([
          'link "SW-002-b.md#no-such-heading" points at a heading that does not exist',
        ]);
      });

      test("an external URL and a bare in-document anchor are not checked", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "See [home](https://example.com) and [top](#a-heading).\n## A heading\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(result.findings).toEqual([]);
      });
    },
  );
});

describe("corpus invariant checks", () => {
  verifies(
    [
      ConTraceables.CON_022_VALID_STATUS,
      ConTraceables.CON_025_ONE_FILE_PER_SPEC_ID,
    ],
    () => {
      test("an unrecognized status is reported (invalid-status)", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "**Lens**: SW\n\n**Status**: in-progress\n",
          "utf8",
        );
        await writeFile(
          join(p.derivedDir, "SW-002-b.md"),
          "**Status**: active\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(
          result.findings.filter((f) => f.check === "invalid-status"),
        ).toEqual([
          {
            check: "invalid-status",
            file: "docs/spec/derived-specs/SW-001-a.md",
            line: 3,
            message:
              'unrecognized status "in-progress"; expected one of planned, active, deprecated',
          },
        ]);
      });

      test("a CRLF spec file's status is parsed without the carriage return", async () => {
        const p = await project();
        await writeFile(
          join(p.derivedDir, "SW-001-a.md"),
          "**Lens**: SW\r\n\r\n**Status**: active\r\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(
          result.findings.filter((f) => f.check === "invalid-status"),
        ).toEqual([]);
      });

      test("two files declaring one id are reported (duplicate-id)", async () => {
        const p = await project();
        await writeFile(join(p.derivedDir, "SW-003-x.md"), "x\n", "utf8");
        await writeFile(join(p.derivedDir, "SW-003-y.md"), "y\n", "utf8");

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        const duplicate = result.findings.filter(
          (f) => f.check === "duplicate-id",
        );
        expect(duplicate).toHaveLength(1);
        expect(duplicate[0]?.message).toContain('spec id "SW-003"');
        expect(duplicate[0]?.message).toContain("SW-003-x.md");
        expect(duplicate[0]?.message).toContain("SW-003-y.md");
      });
    },
  );
});

describe("the spec-id-in-comment check", () => {
  verifies(
    [
      SysTraceables.SYS_014_DETECT_REFERENCES_BYPASSING_ANCHOR,
      SwTraceables.SW_033_FLAG_SPEC_ID_IN_COMMENT,
      ConTraceables.CON_026_SPEC_ID_ONLY_IN_ANCHOR,
      ArchTraceables.ARCH_006_PLUGGABLE_COMMENT_FINDERS,
    ],
    () => {
      function commentFindings(findings: Finding[]): Finding[] {
        return findings.filter((f) => f.check === "spec-id-in-comment");
      }

      test("a spec id in a JavaScript-family comment is reported", async () => {
        const p = await project();
        await writeFile(
          join(p.root, "x.mjs"),
          "export const a = 1; // see SW-032\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(commentFindings(result.findings).map((f) => f.file)).toEqual([
          "x.mjs",
        ]);
      });

      test("a spec id in a line comment is reported with its location", async () => {
        const p = await project();
        await writeFile(
          join(p.root, "x.ts"),
          "const a = 1; // see SW-032 for the why\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(commentFindings(result.findings)).toEqual([
          {
            check: "spec-id-in-comment",
            file: "x.ts",
            line: 1,
            message:
              'spec id "SW-032" in a comment must appear only inside its anchor',
          },
        ]);
      });

      test("the underscore anchor form, and an id in a string, are not reported", async () => {
        const p = await project();
        await writeFile(
          join(p.root, "x.ts"),
          'const id = Sw.SW_032_MINT;\nconst label = "SW-032";\n',
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(commentFindings(result.findings)).toEqual([]);
      });

      test("a spec id deep in a block comment reports the right line", async () => {
        const p = await project();
        await writeFile(
          join(p.root, "x.ts"),
          "/**\n * A doc block.\n * Implements SW-040 here.\n */\nexport const y = 1;\n",
          "utf8",
        );

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        const found = commentFindings(result.findings);
        expect(found).toHaveLength(1);
        expect(found[0]?.line).toBe(3);
      });

      test("a language with no registered finder is skipped", async () => {
        const p = await project();
        await writeFile(join(p.root, "x.py"), "# see SW-032\n", "utf8");

        const result = await check({
          configFile: p.configFile,
          resolveGenerator,
        });

        expect(commentFindings(result.findings)).toEqual([]);
      });

      test("without a generator resolver, the comment check is skipped but the suite still runs", async () => {
        const p = await project();
        await writeFile(
          join(p.root, "x.ts"),
          "const a = 1; // see SW-032 for the why\n",
          "utf8",
        );

        const result = await check({ configFile: p.configFile });

        expect(commentFindings(result.findings)).toEqual([]);
      });
    },
  );
});

describe("exclusions apply to every check", () => {
  verifies(SwTraceables.SW_024_EXCLUDE_MATCHING_PATHS, () => {
    test("an excluded spec file is not checked", async () => {
      const p = await project({
        exclude: ["docs/spec/derived-specs/SW-001-a.md"],
      });
      await writeFile(
        join(p.derivedDir, "SW-001-a.md"),
        "See [gone](SW-999-missing.md).\n",
        "utf8",
      );

      const result = await check({
        configFile: p.configFile,
        resolveGenerator,
      });

      expect(result.findings).toEqual([]);
    });

    test("a link to an excluded target is not validated", async () => {
      const p = await project({
        exclude: ["docs/spec/derived-specs/SW-002-b.md"],
      });
      await writeFile(
        join(p.storiesDir, "STR-001-x.md"),
        "See [b](../derived-specs/SW-002-b.md#no-such-heading).\n",
        "utf8",
      );
      await writeFile(join(p.derivedDir, "SW-002-b.md"), "## Real\n", "utf8");

      const result = await check({
        configFile: p.configFile,
        resolveGenerator,
      });

      expect(result.findings).toEqual([]);
    });
  });
});

describe("the document-schema check", () => {
  verifies(SysTraceables.SYS_015_VALIDATE_ARTIFACTS_ON_LOAD, () => {
    test("reports a document's project-field violation as a finding", async () => {
      const p = await project({ schemas: { "derived-spec": "ds.yml" } });
      await writeFile(
        join(p.root, "ds.yml"),
        "onError: warn\nfields:\n  Title:\n    required: true\n",
        "utf8",
      );
      await writeFile(
        join(p.derivedDir, "SW-001-a.md"),
        "**Lens**: SW\n",
        "utf8",
      );

      const result = await check({
        configFile: p.configFile,
        resolveGenerator,
      });

      const schemaFindings = result.findings.filter(
        (f) => f.check === "document-schema",
      );
      expect(schemaFindings).toHaveLength(1);
      expect(schemaFindings[0]?.file).toBe(
        "docs/spec/derived-specs/SW-001-a.md",
      );
      expect(schemaFindings[0]?.message).toContain(
        'warn: missing required field "Title"',
      );
    });

    test("with no schema configured, the check reports nothing", async () => {
      const p = await project();
      await writeFile(
        join(p.derivedDir, "SW-001-a.md"),
        "**Lens**: SW\n",
        "utf8",
      );

      const result = await check({
        configFile: p.configFile,
        resolveGenerator,
      });

      expect(
        result.findings.filter((f) => f.check === "document-schema"),
      ).toEqual([]);
    });
  });
});
