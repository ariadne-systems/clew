**Title**
Each spec belongs to exactly one spec set, or is explicitly ignored

**Lens**: CON

**Status**: active

**Description**
The spec sets partition the specs: every spec is in exactly one set, or is excluded by an `ignore` pattern.
A spec matching more than one set's pattern is a configuration error (overlap).
A spec matching no set and no ignore pattern is a configuration error (unmatched), unless a catch-all set is configured to receive it.
Nothing is grouped into two sets silently, and nothing is left out silently.

**Rationale**
A spec in two sets would appear in two symbol sets, making its anchor ambiguous; a spec in no set would not be anchorable at all.
Failing on both — rather than resolving them by order or dropping them — keeps the generated sets coherent and forces the configuration to account for every spec, the same fail-loud discipline the tool applies elsewhere.
Exclusion stays explicit: a spec is left out only by an `ignore` pattern, never by accident.

**Verification Description**
A spec matching two configured sets is rejected with an explicit error.
A spec matching no set and no ignore pattern is rejected with an explicit error, unless a catch-all set is configured, in which case it joins the catch-all.
A spec matching an ignore pattern is in no set and produces no symbol.

## Relations

**Concerns**

- [ENT-002 — Configuration](../domain-model.md#ent-002-configuration)

## Changes

- **2026-06-26** — Renamed "traceable" to "spec" throughout: a *traceable* is the generated enum member (CON-020), and the partition is of the specs the scan finds, before they are generated into traceables.
The partition rule (exactly one set, or explicitly ignored) is unchanged; this only aligns the vocabulary.
- **2026-06-27** — Recorded the sibling check CON-025 (STR-023): the scan rejects two files that declare one id, the same fail-fast-on-an-ambiguous-corpus discipline this partition rule applies to spec sets.
