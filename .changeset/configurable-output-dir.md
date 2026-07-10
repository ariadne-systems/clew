---
"@ariadne-thread/clew": minor
---

Configure generators by type and output directory.

The `generators` setting in `.clewrc.json` is now a list of `{ type, outputDir }` entries (a bare type string is still accepted as shorthand), so each generator writes into its own directory rather than a single shared one — different targets land in different, language-idiomatic locations.
`outputDir` is optional; each generator declares a default (for example `src/clew/traceables` for TypeScript) used when the configuration does not set one.
Generators emit file names only; the core resolves each generator's directory and places its files there.
