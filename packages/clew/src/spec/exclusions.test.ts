import { ConTraceables, SwTraceables, verifies } from "@ariadne-thread/trace";
import { describe, expect, test } from "vitest";
import { ClewError, ErrorCode } from "../errors.js";
import type { ExclusionInput, ExclusionRules } from "./exclusions.js";
import {
  compileExclusionRules,
  fileExcluded,
  shouldDescend,
} from "./exclusions.js";

/** Compiles rules from a partial input, defaulting the unset arrays to empty. */
function compile(input: Partial<ExclusionInput>): ExclusionRules {
  return compileExclusionRules({
    exclude: [],
    unexclude: [],
    ...input,
  });
}

describe("root-relative glob semantics", () => {
  verifies(ConTraceables.CON_018_ROOT_RELATIVE_GLOBS, () => {
    test("a bare segment matches only at the root, not nested", () => {
      const rules = compile({ exclude: ["out"] });
      expect(fileExcluded("out/x.ts", rules)).toBe(true);
      expect(fileExcluded("src/adapter/out/x.ts", rules)).toBe(false);
    });

    test("a `**` prefix matches the segment at any depth", () => {
      const rules = compile({ exclude: ["**/out"] });
      expect(fileExcluded("out/x.ts", rules)).toBe(true);
      expect(fileExcluded("src/adapter/out/x.ts", rules)).toBe(true);
    });

    test("matching is case-sensitive", () => {
      const rules = compile({ exclude: ["out"] });
      expect(fileExcluded("out/x.ts", rules)).toBe(true);
      expect(fileExcluded("Out/x.ts", rules)).toBe(false);
    });

    test("a file glob matches files at any depth", () => {
      const rules = compile({ exclude: ["**/*.fixture.ts"] });
      expect(fileExcluded("src/a/b.fixture.ts", rules)).toBe(true);
      expect(fileExcluded("src/a/b.ts", rules)).toBe(false);
    });
  });
});

describe("built-in default exclusions", () => {
  verifies(ConTraceables.CON_016_SCAN_BUILTIN_EXCLUSIONS, () => {
    test("excludes dependency, build-output, and version-control directories by default", () => {
      const rules = compile({});
      // A build output at any depth — the per-module case for Maven and Gradle.
      expect(fileExcluded("target/classes/App.class", rules)).toBe(true);
      expect(
        fileExcluded("service/target/generated-sources/G.java", rules),
      ).toBe(true);
      expect(fileExcluded("module/build/libs/x.jar", rules)).toBe(true);
      // Version-control metadata, including the source copies `.svn` keeps.
      expect(fileExcluded(".svn/pristine/a.java", rules)).toBe(true);
      expect(fileExcluded(".hg/store/x", rules)).toBe(true);
      // The project's own source is scanned.
      expect(fileExcluded("src/main/java/App.java", rules)).toBe(false);
    });
  });
});

describe("exclusion precedence", () => {
  verifies(ConTraceables.CON_017_EXCLUSION_PRECEDENCE, () => {
    test("a built-in default excludes; nothing configured includes the rest", () => {
      const rules = compile({});
      expect(fileExcluded("node_modules/pkg/x.ts", rules)).toBe(true);
      expect(fileExcluded("dist/x.ts", rules)).toBe(true);
      expect(fileExcluded("src/app.ts", rules)).toBe(false);
    });

    test("unexclude re-includes a path a built-in default would exclude", () => {
      const excluded = compile({});
      expect(fileExcluded("dist/keep.ts", excluded)).toBe(true);
      const reincluded = compile({ unexclude: ["dist/keep.ts"] });
      expect(fileExcluded("dist/keep.ts", reincluded)).toBe(false);
    });

    test("a user exclude is absolute — it beats unexclude", () => {
      const rules = compile({
        exclude: ["dist/secret.ts"],
        unexclude: ["**/dist/**"],
      });
      expect(fileExcluded("dist/secret.ts", rules)).toBe(true);
    });

    test("a file under an excluded directory is excluded unless re-included", () => {
      const rules = compile({ unexclude: ["dist/keep/**"] });
      expect(fileExcluded("dist/keep/in.ts", rules)).toBe(false);
      expect(fileExcluded("dist/other.ts", rules)).toBe(true);
    });
  });
});

describe("directory descent", () => {
  verifies(SwTraceables.SW_024_EXCLUDE_MATCHING_PATHS, () => {
    test("a built-in-excluded directory is pruned when nothing re-includes into it", () => {
      const rules = compile({});
      expect(shouldDescend("node_modules", rules)).toBe(false);
      expect(shouldDescend("src", rules)).toBe(true);
    });

    test("a user-excluded directory is never descended", () => {
      const rules = compile({ exclude: ["src/generated"] });
      expect(shouldDescend("src/generated", rules)).toBe(false);
    });

    test("a built-in-excluded directory is descended when an unexclude could reach below it", () => {
      const reachable = compile({ unexclude: ["dist/keep/**"] });
      expect(shouldDescend("dist", reachable)).toBe(true);
      const unreachable = compile({ unexclude: ["src/keep/**"] });
      expect(shouldDescend("dist", unreachable)).toBe(false);
    });
  });
});

describe("pattern compilation", () => {
  verifies(SwTraceables.SW_025_READ_EXCLUSION_PATTERNS, () => {
    test("an uncompilable pattern fails fast with a stable, named error", () => {
      let caught: unknown;
      try {
        compile({ exclude: ["[unterminated"] });
      } catch (error) {
        caught = error;
      }
      expect(caught).toBeInstanceOf(ClewError);
      expect((caught as ClewError).code).toBe(
        ErrorCode.INVALID_EXCLUSION_PATTERN,
      );
      expect((caught as ClewError).message).toContain("[unterminated");
    });

    test("a well-formed pattern that matches nothing is accepted as a no-op", () => {
      const rules = compile({ exclude: ["nowhere/**"] });
      expect(fileExcluded("src/app.ts", rules)).toBe(false);
    });
  });
});
