**Title**
Scan the configured artifacts into the set of scanned specs

**Lens**: SW

**Status**: active

**Description**
Scanning reads the project's configured artifacts and produces the set of scanned specs — each a spec id, its lens, the filename it was declared in, and its implementation status (SW-031).
It is language-neutral: it knows the artifacts, the ids they declare, and the lens of each, not any target language.
Carrying each id, its lens, and its filename lets the scanned specs be grouped into spec sets — the configured groupings (a regex matched against the filename) a generator emits as separate symbol sets, by lens by default — which is how generators organize their output.
This set is the input to generation; an id added to the specs appears in it, an id removed disappears from it.

**Rationale**
Generation must act on exactly the ids the specs declare, no more and no less.
Producing that set once in the core keeps the generators free of any knowledge of where specs live or how they are read.

**Verification Description**
Scanning a fixture artifact tree yields exactly the ids declared in it, each tagged with its lens and the filename it was found in.
Adding or removing a spec changes the set accordingly.
The scan depends only on the configured artifact locations, not on any target language.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

**Realizes**

- [SYS-001 — Compile-checked anchoring](SYS-001-compile-checked-anchoring.md)

## Changes

- **2026-06-25** — The scanned traceable now also carries each spec's implementation status (`not-implemented` / `implemented` / `deprecated`), read by SW-031 (STR-020).
The scan's behaviour is otherwise unchanged; the status is an added field on each traceable, so coverage can scope its gate to implemented specs.
- **2026-06-26** — Renamed the scan's output from "traceables" to "scanned specs": a *traceable* is the generated enum member (CON-020), so what the scan produces — the per-spec record of id, lens, filename, and status — is a scanned spec, which generation turns into traceables.
The scan's behaviour is unchanged; this aligns the vocabulary.
