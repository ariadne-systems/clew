**Title**
Scan the configured artifacts into the set of traceables

**Lens**: SW

**Description**
Scanning reads the project's configured artifacts and produces the set of traceables — each a spec id together with its lens.
It is language-neutral: it knows the artifacts, the ids they declare, and the lens of each, not any target language.
Carrying each id and its lens lets the traceables be grouped into spec sets — the configured groupings a generator emits as separate symbol sets, by lens by default — which is how generators organize their output.
This set is the input to generation; an id added to the specs appears in it, an id removed disappears from it.

**Rationale**
Generation must act on exactly the ids the specs declare, no more and no less.
Producing that set once in the core keeps the generators free of any knowledge of where specs live or how they are read.

**Verification Description**
Scanning a fixture artifact tree yields exactly the ids declared in it, each tagged with its lens.
Adding or removing a spec changes the set accordingly.
The scan depends only on the configured artifact locations, not on any target language.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)
