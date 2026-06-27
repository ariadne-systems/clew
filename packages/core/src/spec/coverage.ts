import type { Dirent } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { Realizes, SysTraceables } from "@ariadne-thread/trace";
import {
  ArchTraceables,
  ConTraceables,
  realizes,
  SwTraceables,
} from "@ariadne-thread/trace";
import type { Waiver } from "../config/config.js";
import { readGenerators } from "../config/config.js";
import { writeFileAtomic } from "../fs/atomic-write.js";
import type {
  AnchorLocation,
  GeneratedTraceable,
  Generator,
  SourceFile,
} from "./generator.js";
import { GENERATED_MARKER, resolveGeneratorOrThrow } from "./generator.js";

// Module-level anchor — this module realizes the coverage-policy capability.
type _Anchors = Realizes<
  SysTraceables.SYS_012_COVERAGE_POLICY_AND_WAIVERS,
  unknown
>;

/**
 * A spec's coverage status: the cross-product of realized and verified, plus
 * `deprecated` — a retiring spec that is listed but not classified (SW-026).
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
export const DEFAULT_COVERAGE_FILE = ".ariadne/coverage.json";

/**
 * Classifies each traceable by whether code **realizes** it and a test
 * **verifies** it (SW-026): Covered (both), Realized (realize only), Verified
 * (verify only), None (neither). Only `realizes` and `verifies` decide the status;
 * a `concerns` anchor contributes to neither, so a concerns-only spec is None
 * (CON-019). The universe is the generated traceables read back through the
 * generator (CON-020) — the `active` and `deprecated` specs; a `planned` spec was
 * never generated and is absent. A `deprecated` traceable is not classified: its
 * status is `deprecated`, so the report lists it without counting it (SW-026). The
 * lens is the id's prefix. The result is sorted by id.
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

/** The lens of a spec id — its prefix, before the first hyphen (`SW-026` → `SW`). */
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
  /** Resolves a configured generator name to its implementation (ADR-0001 D9). */
  resolveGenerator: (name: string) => Generator | undefined;
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Project root the generator output directories resolve against. Defaults to the cwd. */
  projectRoot?: string;
};

/**
 * Reads the coverage universe back from the generated traceables (CON-020,
 * ARCH-004): for each configured generator it reads that generator's output
 * directory and asks the generator to read its own emitted enum members back, then
 * merges them by id (a member any generator marks deprecated is deprecated). The
 * universe is therefore the *generated* set — `active` and `deprecated` specs, the
 * `spec` command's output — not a re-scan of the spec files, so a spec's status is
 * resolved once at generation and an ALM-sourced status is never re-queried per
 * coverage run. The result is sorted by id.
 */
export const readUniverse: (
  options: ReadUniverseOptions,
) => Promise<GeneratedTraceable[]> = realizes(
  [
    ArchTraceables.ARCH_004_GENERATOR_DISCOVERS_MARKERS,
    ConTraceables.CON_020_COVERAGE_UNIVERSE,
  ],
  async (options: ReadUniverseOptions): Promise<GeneratedTraceable[]> => {
    const projectRoot = options.projectRoot ?? ".";
    const generatorConfigs = await readGenerators(options.configFile);
    // Each configured generator's output is independent; read them concurrently.
    const perGenerator = await Promise.all(
      generatorConfigs.map(async (config) => {
        const generator = resolveGeneratorOrThrow(
          config.type,
          options.resolveGenerator,
        );
        const outputDir = config.outputDir ?? generator.defaultOutputDir;
        const files = await readGeneratedFiles(
          join(projectRoot, outputDir),
          generator.sourceExtensions,
        );
        return generator.readTraceables(files);
      }),
    );
    // Merge by id across generators. A member any generator marks deprecated is
    // deprecated (the union of deprecation) — intentional, not a consistency check;
    // detecting divergent generated trees is a separate concern.
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
 * Reads a generator's output directory into the source files of its own
 * extensions that the tool actually generated. Only files carrying
 * GENERATED_MARKER are returned, so a hand-written or stray file in the directory
 * cannot inject phantom traceables — the same guard `pruneStaleGenerated` applies
 * before deleting. The reads run concurrently; a missing directory yields no files.
 */
async function readGeneratedFiles(
  dir: string,
  extensions: readonly string[],
): Promise<SourceFile[]> {
  let entries: Dirent[];
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const candidates = entries.filter(
    (entry) => entry.isFile() && extensions.includes(extname(entry.name)),
  );
  const files = await Promise.all(
    candidates.map(async (entry) => {
      const path = join(dir, entry.name);
      return { path, contents: await readFile(path, "utf8") };
    }),
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

/** Whether a waiver applies to a spec id — by exact id or by glob pattern (SW-030). */
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
 * Reconciles the computed coverage against the committed waiver list (SW-027). A
 * spec that a waiver waives is reported **waived** — carrying its reason — rather
 * than as an open gap. A waiver waives only a missing test: it applies to a spec
 * that is Realized (implemented, not verified) and matches it by id or pattern
 * (SW-030); a spec missing its realizing code — None or verify-only — is never
 * waived (CON-021). A waiver that waives nothing — it matches no Realized spec —
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
      // Only a Realized spec — implemented but untested — is waivable; a spec
      // missing its realizing code is never waived (CON-021).
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
 * Writes the coverage result as `coverage.json` in the shared shape (SW-028;
 * ADR-0005 D6): each spec's id, lens, and status, with the reason for waived ones,
 * plus the stale waivers. The write is atomic — to a temporary file, then renamed
 * into place (NF-002) — and replaces any existing file wholesale. Returns the path
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
 * Formats the coverage result as a human-readable report (SW-028): a count per
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
        // A deprecated spec is listed, never counted toward coverage (SW-026).
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
