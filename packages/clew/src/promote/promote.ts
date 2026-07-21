import { access, readFile, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { ConTraceables, realizes, SwTraceables } from "@ariadne-thread/trace";
import type { Layout } from "../config/config.js";
import { readLayout, readLenses } from "../config/config.js";
import { ClewError, ErrorCode } from "../errors.js";
import {
  type FileWrite,
  TEMP_SUFFIX,
  writeFilesAtomic,
} from "../fs/atomic-write.js";
import { walkFiles } from "../fs/walk-files.js";
import { mint } from "../mint/mint.js";
import {
  findTemporaryReferences,
  parseTemporaryDraftId,
} from "../mint/temporary-id.js";
import { validateOnLoad } from "../spec/document-schema.js";
import { loadSchemas } from "../spec/document-schema-loader.js";
import { escapeRegExp } from "../text/escape-regexp.js";

/** The keyword that roots a promotion at every pending draft rather than a named set. */
const ALL_DRAFTS = "all";

export type PromoteOptions = {
  /** Path to `.clewrc.json`. Defaults to the configuration default. */
  configFile?: string;
  /** Path to the state file. Defaults to the configured `layout.state.file`. */
  stateFile?: string;
  /**
   * The drafts to root the promotion at — each a temporary id, filename, or path —
   * or the single keyword `all` to promote every pending draft. At least one is required.
   */
  roots: readonly string[];
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
 * It resolves the set to promote from the given roots, binds each draft's id by
 * minting its lens, rewrites the temporary ids to the bound ones, and moves each
 * draft into place. It performs no integration reasoning and does not commit.
 */
export const promote: (options: PromoteOptions) => Promise<PromoteResult> =
  realizes(
    SwTraceables.SW_017_FINALIZE_DRAFTS,
    async (options: PromoteOptions): Promise<PromoteResult> => {
      const [layout, lenses] = await Promise.all([
        readLayout(options.configFile),
        readLenses(options.configFile),
      ]);
      const lensIds = new Set(lenses.map((lens) => lens.id));

      const pending = await discoverDrafts(layout.drafts.dir);
      const set = await resolvePromotionSet(
        options.roots,
        pending,
        layout.stories.prefix,
      );
      if (set.length === 0) {
        return { promoted: [] };
      }

      // Validate each story against its schema before binding any id.
      const projectRoot =
        options.configFile === undefined ? "." : dirname(options.configFile);
      const schemas = await loadSchemas(options.configFile, projectRoot);
      for (const draft of set) {
        if (draft.prefix === layout.stories.prefix) {
          validateOnLoad(
            await readFile(draft.path, "utf8"),
            "story",
            schemas,
            draft.path,
          );
        }
      }

      // Resolve every target before binding any id.
      const targets = set.map((draft) => ({
        draft,
        targetDir: resolveTargetDir(draft.prefix, layout, lensIds),
      }));

      const promoted: PromotedDraft[] = [];
      const substitutions = new Map<string, string>();
      for (const { draft, targetDir } of targets) {
        const ids = await mint(draft.prefix, 1, {
          configFile: options.configFile,
          stateFile: options.stateFile ?? layout.state.file,
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

/**
 * Resolves the drafts a promotion finalizes from its roots: each named root —
 * matched by temporary id, filename, or path — and, for a root that is a story,
 * the specs it directly references; or every pending draft for the keyword `all`.
 * An empty `roots`, or a named root that matches nothing, fails.
 */
const resolvePromotionSet: (
  roots: readonly string[],
  pending: readonly DraftFile[],
  storyPrefix: string,
) => Promise<DraftFile[]> = realizes(
  [
    SwTraceables.SW_035_RESOLVE_SET_AS_REFERENCE_CLOSURE,
    ConTraceables.CON_028_PROMOTION_ROOTED_AT_NAMED_DRAFTS,
  ],
  async (
    roots: readonly string[],
    pending: readonly DraftFile[],
    storyPrefix: string,
  ): Promise<DraftFile[]> => {
    if (roots.length === 0) {
      throw new ClewError(
        ErrorCode.INVALID_OPTIONS,
        `promote requires at least one draft to promote, or the keyword "${ALL_DRAFTS}".`,
      );
    }
    // `all` makes every pending draft a root, so it must stand alone — combining it
    // with named roots would silently discard them.
    if (roots.includes(ALL_DRAFTS) && roots.length > 1) {
      throw new ClewError(
        ErrorCode.INVALID_OPTIONS,
        `"${ALL_DRAFTS}" promotes every pending draft and must be the only argument; name drafts, or pass "${ALL_DRAFTS}" alone.`,
      );
    }
    const byTemporaryId = new Map(
      pending.map((draft) => [draft.temporaryId, draft]),
    );
    const seeds = roots.includes(ALL_DRAFTS)
      ? pending
      : roots.map((name) => resolveRoot(name, pending));
    return gatherSet(seeds, byTemporaryId, storyPrefix);
  },
);

/** Resolves a named root to a pending draft, or fails if none matches it. */
function resolveRoot(name: string, pending: readonly DraftFile[]): DraftFile {
  const match = pending.find((draft) => matchesName(draft, name));
  if (match === undefined) {
    throw new ClewError(
      ErrorCode.DRAFT_NOT_FOUND,
      `No pending draft matches "${name}".`,
    );
  }
  return match;
}

/**
 * Gathers the drafts a promotion finalizes: the seed roots, plus — for a root
 * that is a story — the specs it directly references. A spec is a leaf: its
 * references are validated against the set, never followed, so naming a spec
 * never reaches past it. Every draft in the set must reference only drafts the
 * set includes; one that references outside it fails rather than being pulled in.
 */
async function gatherSet(
  seeds: readonly DraftFile[],
  byTemporaryId: ReadonlyMap<string, DraftFile>,
  storyPrefix: string,
): Promise<DraftFile[]> {
  const referencesByDraft = new Map<string, string[]>();
  const referencesOf = async (draft: DraftFile): Promise<string[]> => {
    const cached = referencesByDraft.get(draft.temporaryId);
    if (cached !== undefined) {
      return cached;
    }
    const references = findTemporaryReferences(
      await readFile(draft.path, "utf8"),
    ).filter((reference) => reference !== draft.temporaryId);
    referencesByDraft.set(draft.temporaryId, references);
    return references;
  };

  // Only a story root brings other drafts in (its specs); a spec root is a leaf.
  const set = new Map(seeds.map((draft) => [draft.temporaryId, draft]));
  for (const root of seeds) {
    if (root.prefix !== storyPrefix) {
      continue;
    }
    for (const reference of await referencesOf(root)) {
      const referenced = byTemporaryId.get(reference);
      if (referenced !== undefined) {
        set.set(referenced.temporaryId, referenced);
      }
    }
  }
  // Every draft in the set must reference only drafts the set includes; a
  // reference outside it — a spec's reference, or a spec a story did not list —
  // fails rather than being followed.
  for (const draft of set.values()) {
    for (const reference of await referencesOf(draft)) {
      if (!set.has(reference)) {
        throw unresolvedReference(draft, reference, byTemporaryId);
      }
    }
  }
  return [...set.values()];
}

/** The refusal for a reference that the promotion set does not include. */
function unresolvedReference(
  draft: DraftFile,
  reference: string,
  byTemporaryId: ReadonlyMap<string, DraftFile>,
): ClewError {
  const inSet = byTemporaryId.has(reference);
  return new ClewError(
    ErrorCode.UNRESOLVED_REFERENCE,
    `unresolved reference to "${reference}"`,
    {
      location: draft.path,
      note: inSet
        ? "it names a pending draft this promotion does not include"
        : "it names something that is not a pending draft",
      help: inSet
        ? "promote them together by naming the story that references both"
        : "add the referenced draft, or remove the reference",
    },
  );
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
 * Resolves where a draft is placed from its prefix: a story to the stories
 * directory, a spec (a lens prefix) to the specs directory.
 */
function resolveTargetDir(
  prefix: string,
  layout: Layout,
  lensIds: Set<string>,
): string {
  if (prefix === layout.stories.prefix) {
    return layout.stories.dir;
  }
  if (lensIds.has(prefix)) {
    return layout.specs.dir;
  }
  throw new ClewError(
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
 * Applies a promotion's file changes as a stage-then-commit. Substitution runs
 * only within the drafts location — a still-unpromoted draft that references a
 * promoted one is rewritten to the bound id, while the spec tree is left
 * untouched. Each promoted draft then moves to its bound-id target carrying its
 * substituted content; the writes are staged and committed together by
 * `writeFilesAtomic`, and the moved drafts removed.
 */
const applyAtomically: (
  layout: Layout,
  promoted: readonly PromotedDraft[],
  substitutions: ReadonlyMap<string, string>,
) => Promise<void> = realizes(
  [
    ConTraceables.CON_014_EXHAUSTIVE_SUBSTITUTION,
    ConTraceables.CON_024_ATOMIC_PROMOTION,
    ConTraceables.CON_027_NO_TEMPORARY_ID_IN_PROMOTED_CORPUS,
  ],
  async (
    layout: Layout,
    promoted: readonly PromotedDraft[],
    substitutions: ReadonlyMap<string, string>,
  ): Promise<void> => {
    const draftSources = new Set(promoted.map((entry) => entry.from));

    const writes: FileWrite[] = [];
    // Rewrite in place every other draft that mentions a promoted id — never a file
    // outside the drafts location, and not a promoted draft itself, which is moved.
    for (const file of await collectDraftFiles(layout.drafts.dir)) {
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
    // content. The move list comes from `promoted`, not the file walk, so a draft
    // is moved whatever its filename.
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

/** The files in the drafts location a temporary id can appear in, minus staging temporaries. */
async function collectDraftFiles(draftsDir: string): Promise<string[]> {
  const files: string[] = [];
  for (const file of await walkFiles(draftsDir)) {
    if (!file.name.endsWith(TEMP_SUFFIX)) {
      files.push(file.path);
    }
  }
  return files;
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
