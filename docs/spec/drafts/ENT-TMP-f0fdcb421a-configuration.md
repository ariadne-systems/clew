> Draft entity. On promotion this section is merged into `docs/spec/domain-model.md`
> (entities live there as headings, not as standalone files), and the temp id
> becomes its bound `ENT` id.

### ENT-TMP-f0fdcb421a Configuration

The tool's per-project configuration, read from `.ariadnerc.json` at the project root.
It is version-controlled and shared with the team through git, alongside the state.
Its shape grows only by adding attributes or sections; existing ones are never changed in place.
Every attribute has a documented default, so a missing file or attribute is equivalent to that default (SW-TMP-1d481ff068).

**Attributes**

| Attribute | Type | Description |
| --- | --- | --- |
| `idGeneration.mode` | `"sequential" \| "opaque"` | The id-generation scheme (ARCH-001). Defaults to `sequential`. |
| `idGeneration.padding` | `Integer` | Width to which sequential numbers are zero-padded (CON-003). Defaults to `3`. |
| `idToken.pattern` | `String?` | Regular expression a minted id must match (CON-005). Optional; when unset, no pattern is enforced. |
| `artifacts.dir` | `String` | Directory tree `init` scans to discover existing ids (SW-006). Defaults to `docs/spec`. |
