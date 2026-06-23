import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Realizes, SysTraceables } from "@ariadne-thread/trace";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Waiver } from "../config/config.js";
import type { AnchorLocation, Traceable } from "./generator.js";

// Module-level anchor — this module realizes the coverage-policy capability.
type _Anchors = Realizes<
  SysTraceables.SYS_012_COVERAGE_POLICY_AND_WAIVERS,
  unknown
>;

/** A spec's coverage status, the cross-product of realized and verified. */
export type CoverageStatus = "covered" | "realized" | "verified" | "none";

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

/** A waiver that did not apply — for a Covered spec, or for an unknown id. */
export type StaleWaiver = { id: string; reason: string };

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
 * (CON-019). The universe is exactly the traceables the spec scan produces — every
 * one is classified, with no filter by lens (CON-020). The result is sorted by id.
 */
export const computeCoverage: (
  traceables: readonly Traceable[],
  anchors: readonly AnchorLocation[],
) => SpecCoverage[] = realizes(
  [
    SwTraceables.SW_026_COMPUTE_COVERAGE,
    ConTraceables.CON_019_CONCERNS_NOT_COVERAGE,
    ConTraceables.CON_020_COVERAGE_UNIVERSE,
  ],
  (
    traceables: readonly Traceable[],
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
    return traceables
      .map((traceable) => ({
        id: traceable.id,
        lens: traceable.lens,
        status: statusOf(
          realized.has(traceable.id),
          verified.has(traceable.id),
        ),
      }))
      .sort((left, right) => left.id.localeCompare(right.id));
  },
);

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

/**
 * Reconciles the computed coverage against the committed waiver list (SW-027). A
 * spec that is not Covered and appears in the list is reported **waived** —
 * carrying its reason — rather than as an open gap. A waiver for a spec that is
 * Covered, or for an id not in the universe, does not apply and is reported as a
 * **stale waiver**. The stale waivers are sorted by id.
 */
export const reconcileWaivers: (
  coverage: readonly SpecCoverage[],
  waivers: readonly Waiver[],
) => CoverageResult = realizes(
  SwTraceables.SW_027_APPLY_WAIVERS,
  (
    coverage: readonly SpecCoverage[],
    waivers: readonly Waiver[],
  ): CoverageResult => {
    const statusById = new Map(coverage.map((spec) => [spec.id, spec.status]));
    const reasonById = new Map(
      waivers.map((waiver) => [waiver.id, waiver.reason]),
    );

    const staleWaivers: StaleWaiver[] = [];
    for (const waiver of waivers) {
      const status = statusById.get(waiver.id);
      if (status === undefined || status === "covered") {
        staleWaivers.push({ id: waiver.id, reason: waiver.reason });
      }
    }

    const specs: CoverageEntry[] = coverage.map((spec) => {
      const reason = reasonById.get(spec.id);
      if (reason !== undefined && spec.status !== "covered") {
        return { ...spec, waiver: { reason } };
      }
      return spec;
    });

    return {
      specs,
      staleWaivers: staleWaivers.sort((left, right) =>
        left.id.localeCompare(right.id),
      ),
    };
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
    await mkdir(dirname(file), { recursive: true });
    const temporary = `${file}.tmp`;
    const body = `${JSON.stringify(toShape(result), null, 2)}\n`;
    await writeFile(temporary, body, "utf8");
    await rename(temporary, file);
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
      const counts: Record<CoverageStatus, number> = {
        covered: 0,
        realized: 0,
        verified: 0,
        none: 0,
      };
      const gaps: SpecCoverage[] = [];
      const waived: Array<SpecCoverage & { reason: string }> = [];
      for (const spec of result.specs) {
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

      const lines = [
        `Coverage: ${counts.covered} covered, ${counts.realized} realized, ${counts.verified} verified, ${counts.none} none (${result.specs.length} specs).`,
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
        `Stale waivers (${result.staleWaivers.length})`,
        result.staleWaivers,
        (waiver) => `  ${waiver.id} — ${waiver.reason}`,
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
