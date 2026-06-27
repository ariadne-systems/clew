import { access, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Layout } from "../config/config.js";
import { readLayout, readLenses } from "../config/config.js";
import { AriadneError, ErrorCode } from "../errors.js";
import {
  type FileWrite,
  TEMP_SUFFIX,
  writeFilesAtomic,
} from "../fs/atomic-write.js";
import { walkFiles } from "../fs/walk-files.js";
import { mint } from "../mint/mint.js";
import { parseTemporaryDraftId } from "../mint/temporary-id.js";
import { escapeRegExp } from "../text/escape-regexp.js";

export type PromoteOptions = {
  /** Path to `.ariadnerc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Path to the state file. Defaults to the StateStore default. */
  stateFile?: string;
  /** Drafts to finalize, by temporary id or path. Empty finalizes all pending drafts. */
  drafts?: readonly string[];
};

/** A draft that was finalized: its temporary id bound, and its file moved. */
export type PromotedDraft = {
  temporaryId: string;
  boundId: string;
  /** The draft's path before promotion. */
  from: string;
  /** The draft's path in the spec tree after promotion. */
  to: string;
};

export type PromoteResult = {
  promoted: PromotedDraft[];
};

type DraftFile = {
  path: string;
  fileName: string;
  /** The full temporary id, e.g. `SW-TMP-3faf897204`. */
  temporaryId: string;
  /** The lens or structural prefix, e.g. `SW`. */
  prefix: string;
  /** The filename remainder after the temporary id, e.g. `-promote-command.md`. */
  slug: string;
};

/**
 * Finalizes reviewed drafts into the spec tree: the mechanical half of promotion.
 * For each draft — the pending drafts in the configured drafts location, or the
 * ones named — it binds a real id by minting the draft's lens (its temporary id's
 * prefix), substitutes that temporary id across the corpus, and moves the draft
 * into its configured location renamed to the bound id. The substitution and move
 * are staged to temporary files and committed by rename. It performs no
 * integration reasoning and does not commit.
 */
export const promote: (options?: PromoteOptions) => Promise<PromoteResult> =
  realizes(
    SwTraceables.SW_017_FINALIZE_DRAFTS,
    async (options: PromoteOptions = {}): Promise<PromoteResult> => {
      const [layout, lenses] = await Promise.all([
        readLayout(options.configFile),
        readLenses(options.configFile),
      ]);
      const lensIds = new Set(lenses.map((lens) => lens.id));

      const pending = await discoverDrafts(layout.drafts.dir);
      const selected = selectDrafts(pending, options.drafts);
      if (selected.length === 0) {
        return { promoted: [] };
      }

      // Resolve every target before binding any id, so nothing is spent on a
      // draft that cannot be placed (STR-013).
      const targets = selected.map((draft) => ({
        draft,
        targetDir: resolveTargetDir(draft.prefix, layout, lensIds),
      }));

      const promoted: PromotedDraft[] = [];
      const substitutions = new Map<string, string>();
      for (const { draft, targetDir } of targets) {
        const ids = await mint(draft.prefix, 1, {
          configFile: options.configFile,
          stateFile: options.stateFile,
        });
        const boundId = ids[0];
        if (boundId === undefined) {
          throw new Error(`Minting produced no id for ${draft.temporaryId}.`);
        }
        substitutions.set(draft.temporaryId, boundId);
        promoted.push({
          temporaryId: draft.temporaryId,
          boundId,
          from: draft.path,
          to: join(targetDir, `${boundId}${draft.slug}`),
        });
      }

      await applyAtomically(layout, promoted, substitutions);

      return { promoted };
    },
  );

/** Narrows the selection to the named drafts, or returns all when none are named. */
function selectDrafts(
  pending: readonly DraftFile[],
  names: readonly string[] | undefined,
): DraftFile[] {
  if (names === undefined || names.length === 0) {
    return [...pending];
  }
  return names.map((name) => {
    const match = pending.find((draft) => matchesName(draft, name));
    if (match === undefined) {
      throw new AriadneError(
        ErrorCode.DRAFT_NOT_FOUND,
        `No pending draft matches "${name}".`,
      );
    }
    return match;
  });
}

/** Whether a draft is named by `name` — its temporary id, filename, or path. */
function matchesName(draft: DraftFile, name: string): boolean {
  const target = name.replaceAll("\\", "/");
  return (
    draft.temporaryId === name ||
    draft.fileName === name ||
    draft.path.replaceAll("\\", "/").endsWith(target)
  );
}

/**
 * Resolves where a draft is placed from its prefix (ENT-002): a story to the
 * stories directory, a derived spec (a lens prefix) to the derived-specs
 * directory. An entity draft is a content merge into the domain model, not a
 * file move, so it is unsupported here (STR-013, out of scope).
 */
function resolveTargetDir(
  prefix: string,
  layout: Layout,
  lensIds: Set<string>,
): string {
  if (prefix === layout.stories.prefix) {
    return layout.stories.dir;
  }
  if (prefix === layout.entities.prefix) {
    throw new AriadneError(
      ErrorCode.ENTITY_DRAFT_UNSUPPORTED,
      `Entity draft "${prefix}-…" must be merged into ${layout.entities.file} by hand; promote finalizes stories and derived specs only.`,
    );
  }
  if (lensIds.has(prefix)) {
    return layout.derivedSpecs.dir;
  }
  throw new AriadneError(
    ErrorCode.INVALID_TYPE,
    `Draft prefix "${prefix}" is not the story prefix or a configured lens.`,
  );
}

/** Discovers the draft files under the drafts location, parsing each temporary id. */
async function discoverDrafts(draftsDir: string): Promise<DraftFile[]> {
  const drafts: DraftFile[] = [];
  for (const file of await walkFiles(draftsDir)) {
    const draft = parseDraft(file.path, file.name);
    if (draft !== undefined) {
      drafts.push(draft);
    }
  }
  return drafts;
}

/** Parses a draft's temporary id from its filename, or returns undefined for a non-draft. */
function parseDraft(path: string, fileName: string): DraftFile | undefined {
  // A staging temporary left by an interrupted run is not a draft, even though its
  // head parses as a temporary id.
  if (fileName.endsWith(TEMP_SUFFIX)) {
    return undefined;
  }
  const parsed = parseTemporaryDraftId(fileName);
  if (parsed === undefined) {
    return undefined;
  }
  return {
    path,
    fileName,
    temporaryId: parsed.temporaryId,
    prefix: parsed.prefix,
    slug: fileName.slice(parsed.temporaryId.length),
  };
}

/**
 * Applies a promotion's file changes as a stage-then-commit. Each promoted draft
 * moves to its bound-id target carrying its substituted content; every other spec
 * file that mentions a promoted id is rewritten where it sits. A draft's target
 * must be free first; the writes are then staged and committed together by
 * `writeFilesAtomic`, and the moved drafts removed.
 */
const applyAtomically = realizes(
  [
    ConTraceables.CON_014_EXHAUSTIVE_SUBSTITUTION,
    ConTraceables.CON_024_ATOMIC_PROMOTION,
  ],
  async (
    layout: Layout,
    promoted: readonly PromotedDraft[],
    substitutions: ReadonlyMap<string, string>,
  ): Promise<void> => {
    const draftSources = new Set(promoted.map((entry) => entry.from));

    const writes: FileWrite[] = [];
    // Rewrite in place every spec file that mentions a promoted id — except a
    // promoted draft itself, which is moved rather than rewritten where it sits.
    for (const file of await collectSpecFiles(layout)) {
      if (draftSources.has(file)) {
        continue;
      }
      const original = await readFileOrNull(file);
      if (original === null) {
        continue;
      }
      const updated = applySubstitutions(original, substitutions);
      if (updated !== original) {
        writes.push({ path: file, content: updated });
      }
    }
    // Move each promoted draft to its bound-id target, carrying its substituted
    // content. The move list comes from `promoted`, not the markdown-only file
    // walk, so a draft is moved whatever its filename.
    for (const entry of promoted) {
      const original = await readFileOrNull(entry.from);
      if (original === null) {
        throw new Error(
          `Draft "${entry.from}" disappeared before it could be promoted.`,
        );
      }
      writes.push({
        path: entry.to,
        content: applySubstitutions(original, substitutions),
      });
    }

    // A bound-id target must be free; a collision means the id was already used, so
    // abort before staging anything.
    for (const entry of promoted) {
      if (await pathExists(entry.to)) {
        throw new Error(`Promotion target "${entry.to}" already exists.`);
      }
    }

    await writeFilesAtomic(writes);

    // The targets are committed; remove the moved drafts. If a removal fails (a
    // draft held open, a permission denial), the promotion is already applied — name
    // every leftover so it can be deleted before a retry, which would otherwise
    // promote it again under a new id.
    const unremoved: string[] = [];
    for (const entry of promoted) {
      try {
        await rm(entry.from, { force: true });
      } catch {
        unremoved.push(entry.from);
      }
    }
    if (unremoved.length > 0) {
      throw new Error(
        `Promotion was applied, but these draft files could not be removed: ${unremoved.join(", ")}. Delete them before re-running, or they will be promoted again under new ids.`,
      );
    }
  },
);

/**
 * Replaces every temporary id with its bound id in `text`. Each replacement is
 * bounded so a shorter id (`SW-TMP-1`) never matches inside a longer one
 * (`SW-TMP-10`): a temporary id's trailing run is alphanumeric, so it ends only
 * where no further id character follows.
 */
function applySubstitutions(
  text: string,
  substitutions: ReadonlyMap<string, string>,
): string {
  let updated = text;
  for (const [temporaryId, boundId] of substitutions) {
    updated = updated.replace(
      new RegExp(`${escapeRegExp(temporaryId)}(?![0-9A-Za-z])`, "g"),
      boundId,
    );
  }
  return updated;
}

/** The markdown files a temporary id can appear in: the spec tree and the drafts. */
async function collectSpecFiles(layout: Layout): Promise<string[]> {
  const dirs = [layout.stories.dir, layout.derivedSpecs.dir, layout.drafts.dir];
  const found = new Set<string>([layout.entities.file]);
  for (const dir of dirs) {
    for (const file of await walkFiles(dir)) {
      if (file.name.endsWith(".md")) {
        found.add(file.path);
      }
    }
  }
  return [...found];
}

/** Reads a file, treating a missing file as absent rather than an error. */
async function readFileOrNull(file: string): Promise<string | null> {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

/** Whether a path exists. A missing path is `false`; any other error propagates. */
async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}
