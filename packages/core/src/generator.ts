/**
 * The language emission seam (ARCH-003; STR-011).
 * Emitting the traceable symbols and the anchoring utility for a target language
 * is the job of a language-specific generator, chosen by configuration and
 * implemented behind this narrow interface. The core depends only on this
 * interface, never on a concrete generator — the boundary that must not erode
 * (ADR-0001 D9). It is the sibling of the id-generation seam (IdStrategy,
 * ARCH-001): same shape, but for language emission rather than the id's variable
 * part.
 */

/**
 * A single scanned spec: its id, its lens (its prefix), and the filename it was
 * declared in (SW-013). The filename is what spec-set matchers match against, so
 * a grouping can select on the descriptive slug, not only the sparse id (whose
 * only matchable part is the lens prefix).
 */
export interface Traceable {
  readonly id: string;
  readonly lens: string;
  readonly filename: string;
}

/**
 * A configured grouping of traceables a generator emits as one symbol set
 * (SW-013, ARCH-003). Grouping is by lens by default; the configurable grouping
 * rules are the follow-on story (STR-012) and are not built here.
 */
export interface SpecSet {
  /** The set's name; the lens id when grouping by lens (the default). */
  readonly name: string;
  readonly traceables: readonly Traceable[];
}

/**
 * A file a generator produces. The path is relative to the output root and is a
 * language-specific decision the generator owns; the core only writes the bytes,
 * so it carries no language knowledge (SW-014).
 */
export interface GeneratedFile {
  readonly path: string;
  readonly contents: string;
}

/**
 * A language-specific generator (ARCH-003). Given the traceables grouped into
 * spec sets, it produces the verifiable symbols — one symbol set per spec set,
 * not a single flat list — and the anchoring utility that lets code mark a type,
 * a value, or a test against a spec id, constrained to those symbols.
 */
export interface Generator {
  /** Stable name matched against the configured `generators` list. */
  readonly name: string;
  /** Emits the traceable symbols and the anchoring utility for the spec sets. */
  generate(specSets: readonly SpecSet[]): Promise<readonly GeneratedFile[]>;
}
