---
"@ariadne-thread/clew": minor
---

`clew setup` no longer scaffolds a default `STK-*` coverage waiver; a freshly scaffolded configuration starts with an empty `waivers` list. The default rested on two premises that do not hold: that a stakeholder need cannot be verified by a test (a blanket claim a lens-wide default cannot make — some stakeholder needs decompose into a testable acceptance behaviour, and genuine quality needs are handled by a *per-spec* waiver, which is the shape uniform coverage already prescribes for a real exception), and that shipping it "keeps the first coverage run honest" (a fresh project has no specs, so its first run is green regardless; the waiver's only later effect is to suppress the coverage gap of an unanchored stakeholder spec — the opposite of honest). A project that genuinely acceptance-verifies a stakeholder need now adds a per-spec waiver deliberately. Existing configurations are unaffected; setup never overwrites an existing `waivers` list.
