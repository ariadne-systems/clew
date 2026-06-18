import type { Dirent } from "node:fs";
import { mkdir, readdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import type { Layout } from "./config.js";
import { readLayout, readLenses } from "./config.js";
import { AriadneError, ErrorCode } from "./errors.js";
import { mint } from "./mint.js";

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

/** A draft filename begins with a temporary id: `<PREFIX>-TMP-<opaque>` (SW-005). */
const TEMPORARY_DRAFT_FILENAME = /^([A-Z]+)-TMP-[0-9a-f]+/;

/**
 * Finalizes reviewed drafts into the spec tree (SW-017; STR-013): the mechanical
 * half of promotion. For each draft — the pending drafts in the configured drafts
 * location, or the ones named — it binds a real id by minting the draft's lens
 * (its temporary id's prefix), substitutes that temporary id project-wide
 * (CON-014), and moves the draft into its configured location renamed to the
 * bound id. Ids are bound first, then the substitution runs, then the files move,
 * so a failure never leaves a half-substituted tree (STR-013). It performs no
 * integration reasoning and does not commit.
 */
export async function promote(
  options: PromoteOptions = {},
): Promise<PromoteResult> {
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

  // Resolve every target before binding any id, so nothing is spent on a draft
  // that cannot be placed (STR-013).
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

  await substituteProjectWide(layout, substitutions);

  for (const entry of promoted) {
    await mkdir(dirname(entry.to), { recursive: true });
    await rename(entry.from, entry.to);
  }

  return { promoted };
}

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
  await walkDrafts(draftsDir, drafts);
  return drafts;
}

async function walkDrafts(dir: string, drafts: DraftFile[]): Promise<void> {
  const entries = await readDirOrEmpty(dir);
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkDrafts(full, drafts);
    } else {
      const draft = parseDraft(full, entry.name);
      if (draft !== undefined) {
        drafts.push(draft);
      }
    }
  }
}

/** Parses a draft's temporary id from its filename, or returns undefined for a non-draft. */
function parseDraft(path: string, fileName: string): DraftFile | undefined {
  const match = TEMPORARY_DRAFT_FILENAME.exec(fileName);
  if (match === null || match[1] === undefined) {
    return undefined;
  }
  const temporaryId = match[0];
  return {
    path,
    fileName,
    temporaryId,
    prefix: match[1],
    slug: fileName.slice(temporaryId.length),
  };
}

/**
 * Replaces every temporary id with its bound id across the configured spec
 * locations and the drafts location — the only places a temporary id appears
 * (CON-014). A temporary id is globally unique, so a literal replace is exact.
 */
async function substituteProjectWide(
  layout: Layout,
  substitutions: ReadonlyMap<string, string>,
): Promise<void> {
  const files = await collectSpecFiles(layout);
  for (const file of files) {
    const original = await readFileOrNull(file);
    if (original !== null) {
      let updated = original;
      for (const [temporaryId, boundId] of substitutions) {
        updated = updated.replaceAll(temporaryId, boundId);
      }
      if (updated !== original) {
        await writeFile(file, updated, "utf8");
      }
    }
  }
}

/** The markdown files a temporary id can appear in: the spec tree and the drafts. */
async function collectSpecFiles(layout: Layout): Promise<string[]> {
  const dirs = [layout.stories.dir, layout.derivedSpecs.dir, layout.drafts.dir];
  const found = new Set<string>([layout.entities.file]);
  for (const dir of dirs) {
    await walkMarkdown(dir, found);
  }
  return [...found];
}

async function walkMarkdown(dir: string, found: Set<string>): Promise<void> {
  const entries = await readDirOrEmpty(dir);
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walkMarkdown(full, found);
    } else if (entry.name.endsWith(".md")) {
      found.add(full);
    }
  }
}

/** Lists a directory's entries, treating a missing directory as empty. */
async function readDirOrEmpty(dir: string): Promise<Dirent[]> {
  try {
    return await readdir(dir, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
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
