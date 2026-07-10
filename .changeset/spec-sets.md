---
"@ariadne-thread/clew": minor
---

Add configurable spec sets (STR-012).

A project can declare a `specSets` section — an ordered list of `{ name, pattern }`, where `pattern` is a regular expression over a spec's filename — and `clew spec` emits one symbol set per declared set instead of the default one-set-per-lens.
The sets partition the traceables: a traceable matching more than one set fails with `E_SPEC_SET_OVERLAP`, and a traceable matching no set fails with `E_SPEC_SET_UNMATCHED` unless a `catchAll` set is configured to collect it.
An `ignore` list of patterns excludes matching traceables from every set, so no symbol is generated for them.
With no `specSets` configured, grouping stays one set per lens.
