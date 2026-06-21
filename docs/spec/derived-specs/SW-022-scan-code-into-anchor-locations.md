**Title**
Scan the code into the set of anchor locations

**Lens**: SW

**Description**
Scanning the code drives each configured generator's discover operation over the project's source and aggregates the results into the project's **anchor locations** — a collection, not a set: the same spec id may be anchored at many locations, and every one is recorded.
An anchor location is a spec id, the relation it was anchored with (`realizes` / `verifies` / `concerns`), and where it was found — the file path (relative to the project root) and the line number; the location is file-and-line, with no column, matching the shared locations shape (ADR-0005 D6) — a deliberate limit: two markers on one line share a location, and column precision is a future option the traced-context use may want, not part of this story.
The core is language-neutral: it knows the source roots and the configured generators, not any marker syntax — each generator finds its own anchors (ARCH-004), and the core only collects and unifies them.
This collection is the input the later coverage and traceback steps stand on; it is the reverse of the spec→traceables scan that feeds generation (SW-013), and is produced the same way — once, in the core.

**Rationale**
Coverage and traceback both need one uniform, located record of every anchor in the code, independent of language.
Producing that set once in the core, by delegating the language-specific finding to the generators, keeps the core free of marker syntax and gives every consumer the same input.
Carrying the relation and the location on each anchor is what lets a later step separate coverage (realizes / verifies) from context (concerns) and point a reader at the exact site (ADR-0005 D1, D4).

**Verification Description**
Scanning a fixture source tree yields exactly the anchors in it, each tagged with its relation and its file-and-line.
All three relations and every marker form are represented.
The core drives discovery through the generator interface only and references no concrete generator type; with a fake generator it aggregates that generator's reported anchors unchanged.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
