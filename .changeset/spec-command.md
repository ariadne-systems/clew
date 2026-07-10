---
"@ariadne-thread/clew": minor
---

Add the `clew spec` command (STR-011).

The command scans the configured specs into a language-neutral set of traceables — each id tagged with its lens — and delegates emission to the configured language generators through a narrow generator interface, so the core depends on no concrete generator (ARCH-003).
Each generator produces the traceable symbols, organized into one symbol set per spec set (by lens by default), and the anchoring utility that lets code mark a type, value, or test against a spec id.
Generation is deterministic and the generated files are tool-owned: re-running on unchanged specs produces byte-identical output (CON-012).
A configured generator that is not registered fails fast with the new `E_UNKNOWN_GENERATOR` code.
