import {
  type ArchTraceables,
  ConTraceables,
  type Realizes,
  realizes,
} from "@ariadne-thread/trace";

/**
 * The language emission seam (STR-011).
 * Emitting the traceable symbols and the anchoring utility for a target language
 * is the job of a language-specific generator, chosen by configuration and
 * implemented behind this narrow interface. The core depends only on this
 * interface, never on a concrete generator — the boundary that must not erode
 * (ADR-0001 D9). It is the sibling of the id-generation seam (IdStrategy):
 * same shape, but for language emission rather than the id's variable
 * part.
 */

/**
 * A single scanned spec: its id, its lens (its prefix), and the filename it was
 * declared in. The filename is what spec-set matchers match against, so
 * a grouping can select on the descriptive slug, not only the sparse id (whose
 * only matchable part is the lens prefix).
 */
export interface Traceable {
  readonly id: string;
  readonly lens: string;
  readonly filename: string;
}

/**
 * A configured grouping of traceables a generator emits as one symbol set.
 * Grouping is by lens by default; the configurable grouping
 * rules are the follow-on story (STR-012) and are not built here.
 */
export interface SpecSet {
  /** The set's name; the lens id when grouping by lens (the default). */
  readonly name: string;
  readonly traceables: readonly Traceable[];
}

/**
 * A file a generator produces. The path is the file's name within the project's
 * configured output directory (ENT-002); the core joins it under that directory
 * and writes the bytes, so the generator decides filenames and the core decides
 * the location, and the core carries no language knowledge.
 */
export interface GeneratedFile {
  readonly path: string;
  readonly contents: string;
}

/** Context the core passes to a generator: the resolved directory its files will be written into (ENT-002). */
export interface GenerateContext {
  readonly outputDir: string;
}

/** The relation a marker expresses (ADR-0004): the code realizes, verifies, or is concerned with a spec. */
export type Relation = "realizes" | "verifies" | "concerns";

/** A source file handed to a generator's discover: its project-root-relative path and its text. */
export interface SourceFile {
  readonly path: string;
  readonly contents: string;
}

/**
 * A located anchor the scan found: the spec id, the relation it was anchored
 * with, and where — a project-root-relative file path and a 1-based line number.
 * There is no column: the location is file-and-line, matching the shared
 * locations shape (ADR-0005 D6). The same id may occur at many locations.
 */
export interface AnchorLocation {
  readonly id: string;
  readonly relation: Relation;
  readonly file: string;
  readonly line: number;
}

/**
 * A language-specific generator. Given the traceables grouped into
 * spec sets, it produces the verifiable symbols — one symbol set per spec set,
 * not a single flat list — and the anchoring utility that lets code mark a type,
 * a value, or a test against a spec id, constrained to those symbols. It is told
 * where its files will land (the context) so it can emit correct internal
 * references, such as a Java package matching the output directory.
 */
export interface Generator
  extends Realizes<
    [
      ArchTraceables.ARCH_003_GENERATOR_INTERFACE,
      ArchTraceables.ARCH_004_GENERATOR_DISCOVERS_MARKERS,
    ],
    unknown
  > {
  /** Stable name matched against a configured generator's `type`. */
  readonly name: string;
  /**
   * The directory this generator writes into when a configured generator does
   * not set its own `outputDir` (ENT-002) — the generator's idiomatic location
   * for the target language. The core reads it as an opaque path.
   */
  readonly defaultOutputDir: string;
  /**
   * The file extensions (each with a leading dot) whose files this generator
   * scans for anchors. The core reads only files matching some generator's
   * extensions, and hands each generator its own (ARCH-004).
   */
  readonly sourceExtensions: readonly string[];
  /** Emits the traceable symbols and the anchoring utility for the spec sets. */
  generate(
    specSets: readonly SpecSet[],
    context: GenerateContext,
  ): Promise<readonly GeneratedFile[]>;
  /**
   * Discovers the anchors this generator's markers declare in the given sources —
   * the dual of generate (ARCH-004). The core selects the files and applies
   * exclusions; the generator reads its own marker grammar back out, returning a
   * located anchor per marker. Generation and discovery name the same ids: the
   * markers a generator emits round-trip through its discover (ADR-0005 D2).
   */
  discover(sources: readonly SourceFile[]): readonly AnchorLocation[];
}

/**
 * The marker every generated file's banner carries. The core uses it to
 * recognize, and prune, files it generated in a previous run that are no longer
 * emitted — so a removed spec set's stale file does not linger.
 */
export const GENERATED_MARKER = "GENERATED BY ARIADNE-THREAD";

/** The project homepage, recorded in the provenance banner. */
const HOMEPAGE = "https://ariadne-thread.io";

/**
 * The generated-file banner shared by every generator: a do-not-edit warning
 * (carrying GENERATED_MARKER), a regenerate hint, and `@ariadne-thread` provenance
 * annotations. A per-set file also carries its spec set. The banner is static, so
 * regeneration stays byte-identical. The lines are a `/* … *\/` block —
 * valid in both TypeScript and Java — so all generators share one provenance
 * format. The caller wraps these lines in nothing further; it returns the full
 * comment.
 */
export const generatedHeader: (
  generatorType: string,
  specSet?: string,
) => string[] = realizes(
  ConTraceables.CON_012_GENERATED_FILES_TOOL_OWNED,
  (generatorType: string, specSet?: string): string[] => {
    const lines = [
      "/*",
      ` * THIS FILE IS ${GENERATED_MARKER} - DO NOT EDIT MANUALLY`,
      " *",
      " * Run `clew spec` to regenerate.",
      " *",
      ` * @ariadne-thread homepage: ${HOMEPAGE}`,
      " * @ariadne-thread connector-type: req-as-code",
      ` * @ariadne-thread generator-type: ${generatorType}`,
    ];
    if (specSet !== undefined) {
      lines.push(` * @ariadne-thread spec-set: ${specSet}`);
    }
    lines.push(" */");
    return lines;
  },
);
