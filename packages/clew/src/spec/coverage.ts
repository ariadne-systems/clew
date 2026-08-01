import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Realizes, SysTraceables } from "@ariadne-thread/trace";
import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import type { Waiver } from "../config/config.js";
import { readGenerators, readWaivers } from "../config/config.js";
import { writeFileAtomic } from "../fs/atomic-write.js";
import { walkFiles } from "../fs/walk-files.js";
import { resolveBuiltinGenerator } from "../generators/registry.js";
import type {
  AnchorLocation,
  GeneratedTraceable,
  Generator,
  SourceFile,
} from "./generator.js";
import {
  GENERATED_MARKER,
  GENERATED_SUBDIR,
  resolveGeneratorOrThrow,
} from "./generator.js";
import { scanCode } from "./scan-code.js";

// Module-level anchor.
type _Anchors = Realizes<
  SysTraceables.SYS_012_COVERAGE_POLICY_AND_WAIVERS,
  unknown
>;

/**
 * A spec's coverage status: the cross-product of realized and verified, plus
 * `deprecated` — a retiring spec that is listed but not classified.
 */
export type CoverageStatus =
  | "covered"
  | "realized"
  | "verified"
  | "none"
  | "deprecated";

/** A spec in the coverage universe, with its computed status. */
export type SpecCoverage = {
  id: string;
  lens: string;
  status: CoverageStatus;
};

/** A spec's coverage, plus the waiver that accepts it when it is not covered. */
export type CoverageEntry = SpecCoverage & {
  /** Present when a committed waiver accepts this (not-Covered) spec. */
  waiver?: { reason: string };
};

/** A waiver that waived nothing — it matched no Realized spec. */
export type StaleWaiver = { id?: string; pattern?: string; reason: string };

/** The reconciled coverage of the whole universe. */
export type CoverageResult = {
  /** Every spec in the universe, with its status and any applied waiver. */
  specs: CoverageEntry[];
  /** Waivers that did not apply. */
  staleWaivers: StaleWaiver[];
};

/** Default location of the written coverage result. */
export const DEFAULT_COVERAGE_FILE = ".clew/coverage.json";

/**
 * Classifies each traceable by whether code **realizes** it and a test
 * **verifies** it: Covered (both), Realized (realize only), Verified
 * (verify only), None (neither). A `deprecated` traceable is not classified: its
 * status is `deprecated`. The lens is the id's prefix. The result is sorted by id.
 */
export const computeCoverage: (
  universe: readonly GeneratedTraceable[],
  anchors: readonly AnchorLocation[],
) => SpecCoverage[] = realizes(
  [
    SwTraceables.SW_026_COMPUTE_COVERAGE,
    ConTraceables.CON_019_CONCERNS_NOT_COVERAGE,
    ConTraceables.CON_020_COVERAGE_UNIVERSE,
  ],
  (
    universe: readonly GeneratedTraceable[],
    anchors: readonly AnchorLocation[],
  ): SpecCoverage[] => {
    const realized = new Set<string>();
    const verified = new Set<string>();
    for (const anchor of anchors) {
      if (anchor.relation === "realizes") {
        realized.add(anchor.id);
      } else if (anchor.relation === "verifies") {
        verified.add(anchor.id);
      }
    }
    return universe
      .map((traceable) => ({
        id: traceable.id,
        lens: lensOf(traceable.id),
        status: traceable.deprecated
          ? ("deprecated" as const)
          : statusOf(realized.has(traceable.id), verified.has(traceable.id)),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  },
);

/** The lens of a spec id — its prefix, before the first hyphen (`SW-NNN` → `SW`). */
function lensOf(id: string): string {
  const hyphen = id.indexOf("-");
  return hyphen === -1 ? id : id.slice(0, hyphen);
}

/** The status for a spec's realized/verified pair. */
function statusOf(realized: boolean, verified: boolean): CoverageStatus {
  if (realized && verified) {
    return "covered";
  }
  if (realized) {
    return "realized";
  }
  if (verified) {
    return "verified";
  }
  return "none";
}

export type ReadUniverseOptions = {
  /**
   * Resolves a configured generator name to its implementation. Defaults to the
   * in-tree generator registry.
   */
  resolveGenerator?: (name: string) => Generator | undefined;
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the generator output directories resolve against. Defaults to the cwd. */
  projectRoot?: string;
};

/**
 * Reads the coverage universe back from the generated traceables: for each
 * configured generator it reads that generator's output
 * directory and asks the generator to read its own emitted enum members back, then
 * merges them by id (a member any generator marks deprecated is deprecated). The
 * result is sorted by id.
 */
export const readUniverse: (
  options?: ReadUniverseOptions,
) => Promise<GeneratedTraceable[]> = realizes(
  [
    ArchTraceables.ARCH_004_GENERATOR_DISCOVERS_MARKERS,
    ConTraceables.CON_020_COVERAGE_UNIVERSE,
  ],
  async (options: ReadUniverseOptions = {}): Promise<GeneratedTraceable[]> => {
    const projectRoot = options.projectRoot ?? ".";
    const resolveGenerator =
      options.resolveGenerator ?? resolveBuiltinGenerator;
    const generatorConfigs = await readGenerators(options.configFile);
    const perGenerator = await Promise.all(
      generatorConfigs.map(async (config) => {
        const generator = resolveGeneratorOrThrow(
          config.type,
          resolveGenerator,
        );
        const outputDir = join(
          config.outputDir ?? generator.defaultOutputDir,
          GENERATED_SUBDIR,
        );
        const files = await readGeneratedFiles(
          join(projectRoot, outputDir),
          generator.sourceExtensions,
        );
        return generator.readTraceables(files);
      }),
    );
    // Merge by id across generators; a member any generator marks deprecated is
    // deprecated (the union of deprecation).
    const deprecatedById = new Map<string, boolean>();
    for (const traceable of perGenerator.flat()) {
      deprecatedById.set(
        traceable.id,
        traceable.deprecated || (deprecatedById.get(traceable.id) ?? false),
      );
    }
    return [...deprecatedById.entries()]
      .map(([id, deprecated]) => ({ id, deprecated }))
      .sort((left, right) => left.id.localeCompare(right.id));
  },
);

/**
 * Reads a generator's reserved output directory — recursively — into the source
 * files of its own extensions that the tool actually generated. Only files carrying
 * GENERATED_MARKER are returned. The reads run concurrently; a missing directory
 * yields no files.
 */
async function readGeneratedFiles(
  dir: string,
  extensions: readonly string[],
): Promise<SourceFile[]> {
  const walked = await walkFiles(dir);
  const candidates = walked.filter((file) =>
    extensions.includes(extname(file.name)),
  );
  const files = await Promise.all(
    candidates.map(async (file) => ({
      path: file.path,
      contents: await readFile(file.path, "utf8"),
    })),
  );
  return files.filter((file) => file.contents.includes(GENERATED_MARKER));
}

/** Compiles a spec-id glob — `*` matches any run of characters — to an anchored RegExp. */
function patternToRegExp(pattern: string): RegExp {
  const body = pattern
    .split("*")
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}$`);
}

/** A waiver's target string, for display and ordering — its id or its pattern. */
function waiverTarget(waiver: { id?: string; pattern?: string }): string {
  return waiver.id ?? waiver.pattern ?? "";
}

/** Whether a waiver applies to a spec id — by exact id or by glob pattern. */
const waiverMatches: (waiver: Waiver, id: string) => boolean = realizes(
  SwTraceables.SW_030_WAIVER_MATCH_BY_ID_OR_PATTERN,
  (waiver: Waiver, id: string): boolean => {
    if (waiver.id !== undefined) {
      return waiver.id === id;
    }
    if (waiver.pattern !== undefined) {
      return patternToRegExp(waiver.pattern).test(id);
    }
    return false;
  },
);

/**
 * Reconciles the computed coverage against the committed waiver list. A
 * spec that a waiver waives is reported **waived** — carrying its reason — rather
 * than as an open gap. A waiver that waives nothing — it matches no Realized spec —
 * is reported as a **stale waiver**. The stale waivers are sorted by target.
 */
export const reconcileWaivers: (
  coverage: readonly SpecCoverage[],
  waivers: readonly Waiver[],
) => CoverageResult = realizes(
  [
    SwTraceables.SW_027_APPLY_WAIVERS,
    ConTraceables.CON_021_MISSING_REALIZE_NEVER_WAIVABLE,
  ],
  (
    coverage: readonly SpecCoverage[],
    waivers: readonly Waiver[],
  ): CoverageResult => {
    const specs: CoverageEntry[] = coverage.map((spec) => {
      if (spec.status !== "realized") {
        return spec;
      }
      const waiver = waivers.find((candidate) =>
        waiverMatches(candidate, spec.id),
      );
      return waiver !== undefined
        ? { ...spec, waiver: { reason: waiver.reason } }
        : spec;
    });

    const realizedIds = coverage
      .filter((spec) => spec.status === "realized")
      .map((spec) => spec.id);
    const staleWaivers: StaleWaiver[] = waivers
      .filter((waiver) => !realizedIds.some((id) => waiverMatches(waiver, id)))
      .map((waiver) => ({ ...waiver }))
      .sort((left, right) =>
        waiverTarget(left).localeCompare(waiverTarget(right)),
      );

    return { specs, staleWaivers };
  },
);

/**
 * Writes the coverage result as `coverage.json` in the shared shape
 * (ADR-0005 D6): each spec's id, lens, and status, with the reason for waived ones,
 * plus the stale waivers. The write is atomic — to a temporary file, then renamed
 * into place — and replaces any existing file wholesale. Returns the path
 * written.
 */
export const writeCoverageResult: (
  result: CoverageResult,
  options?: { file?: string; projectRoot?: string },
) => Promise<string> = realizes(
  SwTraceables.SW_028_EMIT_COVERAGE_RESULT,
  async (
    result: CoverageResult,
    options: { file?: string; projectRoot?: string } = {},
  ): Promise<string> => {
    const file = join(
      options.projectRoot ?? ".",
      options.file ?? DEFAULT_COVERAGE_FILE,
    );
    const body = `${JSON.stringify(toShape(result), null, 2)}\n`;
    await writeFileAtomic(file, body);
    return file;
  },
);

/** The serialized `coverage.json` shape: specs with status, and stale waivers. */
function toShape(result: CoverageResult): {
  specs: Array<{
    id: string;
    lens: string;
    status: CoverageStatus;
    reason?: string;
  }>;
  staleWaivers: StaleWaiver[];
} {
  return {
    specs: result.specs.map((spec) => ({
      id: spec.id,
      lens: spec.lens,
      status: spec.status,
      ...(spec.waiver !== undefined ? { reason: spec.waiver.reason } : {}),
    })),
    staleWaivers: result.staleWaivers,
  };
}

/**
 * Formats the coverage result as a human-readable report: a count per
 * status over the universe, then the open gaps (not Covered, not waived), the
 * waived specs, and any stale waivers.
 */
export const formatCoverageReport: (result: CoverageResult) => string =
  realizes(
    SwTraceables.SW_028_EMIT_COVERAGE_RESULT,
    (result: CoverageResult): string => {
      const counts = { covered: 0, realized: 0, verified: 0, none: 0 };
      const gaps: SpecCoverage[] = [];
      const waived: Array<SpecCoverage & { reason: string }> = [];
      const deprecated: SpecCoverage[] = [];
      for (const spec of result.specs) {
        // A deprecated spec is listed, never counted toward coverage.
        if (spec.status === "deprecated") {
          deprecated.push(spec);
          continue;
        }
        counts[spec.status] += 1;
        if (spec.status === "covered") {
          continue;
        }
        if (spec.waiver !== undefined) {
          waived.push({ ...spec, reason: spec.waiver.reason });
        } else {
          gaps.push(spec);
        }
      }

      const counted =
        counts.covered + counts.realized + counts.verified + counts.none;
      const lines = [
        `Coverage: ${counts.covered} covered, ${counts.realized} realized, ${counts.verified} verified, ${counts.none} none (${counted} specs).`,
      ];
      appendSection(
        lines,
        `Open gaps (${gaps.length})`,
        gaps,
        (spec) => `  ${spec.id}  ${spec.status}`,
      );
      appendSection(
        lines,
        `Waived (${waived.length})`,
        waived,
        (spec) => `  ${spec.id}  ${spec.status} — ${spec.reason}`,
      );
      appendSection(
        lines,
        `Deprecated (${deprecated.length})`,
        deprecated,
        (spec) => `  ${spec.id}`,
      );
      appendSection(
        lines,
        `Stale waivers (${result.staleWaivers.length})`,
        result.staleWaivers,
        (waiver) => `  ${waiver.id ?? waiver.pattern} — ${waiver.reason}`,
      );
      return `${lines.join("\n")}\n`;
    },
  );

/**
 * Formats the coverage of each named spec id, in the order given: its status —
 * with a waiver's reason when waived — or, for an id not in the universe, that it
 * is absent. This is the per-spec view `clew coverage <ids>` prints.
 */
export const formatSpecCoverage: (
  result: CoverageResult,
  ids: readonly string[],
) => string = (result: CoverageResult, ids: readonly string[]): string => {
  const byId = new Map(result.specs.map((spec) => [spec.id, spec] as const));
  const lines = ids.map((id) => {
    const spec = byId.get(id);
    if (spec === undefined) {
      return `  ${id}  absent — not in the coverage universe`;
    }
    if (spec.waiver !== undefined) {
      return `  ${spec.id}  ${spec.status} — ${spec.waiver.reason}`;
    }
    return `  ${spec.id}  ${spec.status}`;
  });
  return `${lines.join("\n")}\n`;
};

/** Appends a titled section to the report when it has entries. */
function appendSection<Entry>(
  lines: string[],
  title: string,
  entries: readonly Entry[],
  render: (entry: Entry) => string,
): void {
  if (entries.length === 0) {
    return;
  }
  lines.push("", `${title}:`);
  for (const entry of entries) {
    lines.push(render(entry));
  }
}

/** The outcome of a coverage run: the reconciled result, the file it was written to, and whether the trace was empty. */
export type CoverageRun = {
  result: CoverageResult;
  /** Where the coverage result was written. */
  file: string;
  /** True when no generated traceables were found — `clew spec` has not run. */
  universeEmpty: boolean;
};

/**
 * Runs the coverage pipeline end to end: reads the generated traceables and the
 * code anchors, classifies and reconciles against the committed waivers, and
 * writes the coverage record. The presentation layer formats the returned
 * result; the orchestration is the engine's, so `clew coverage` stays a thin
 * command like `check` and `spec`.
 */
/** Computes the reconciled coverage without writing — the read side shared by the full run and the per-spec query. */
async function computeCoverageRun(): Promise<{
  result: CoverageResult;
  universeEmpty: boolean;
}> {
  const [universe, scanResult, waivers] = await Promise.all([
    readUniverse(),
    scanCode(),
    readWaivers(),
  ]);
  const computed = computeCoverage(universe, scanResult.anchors);
  return {
    result: reconcileWaivers(computed, waivers),
    universeEmpty: universe.length === 0,
  };
}

export async function coverage(): Promise<CoverageRun> {
  const { result, universeEmpty } = await computeCoverageRun();
  const file = await writeCoverageResult(result);
  return { result, file, universeEmpty };
}

/** The outcome of a per-spec query: the report to print, and whether the trace was empty. */
export type SpecCoverageQuery = { report: string; universeEmpty: boolean };

/**
 * The read-only per-spec query behind `clew coverage <ids>`: computes coverage
 * over the whole corpus but writes no `coverage.json` — that file stays the bare
 * `clew coverage`'s — and returns the report for just the named ids.
 */
export const coverageOf: (
  ids: readonly string[],
) => Promise<SpecCoverageQuery> = realizes(
  SwTraceables.SW_051_COVERAGE_REPORTS_NAMED_SPECS,
  async (ids: readonly string[]): Promise<SpecCoverageQuery> => {
    const { result, universeEmpty } = await computeCoverageRun();
    return { report: formatSpecCoverage(result, ids), universeEmpty };
  },
);
