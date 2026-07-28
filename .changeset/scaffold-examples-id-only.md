---
"@ariadne-thread/clew": patch
---

`clew setup` now scaffolds the example story and spec (`story.example.md`, `spec.example.md`) with id-only relation links: the target is cited by its spec id alone and any explanatory note follows the link, matching the id-only cross-reference rule the check enforces. Previously the examples carried the spec's title inside the link text — the label form the check rejects — which a reader then copied into their first real spec. Each example's comment now names the convention it demonstrates.
