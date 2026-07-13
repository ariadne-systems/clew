---
"@ariadne-thread/clew": patch
---

Add the `clew-workspace` skill to the shipped method. After `clew setup`, it interviews the user for the stack, verifies the current standards from the tools' own docs, fills the `004` technology contract, and drafts a workspace-setup story for the agent to execute once the user promotes it. `clew-setup` now points to it as the next step when the `004` is still an empty stub (STR-032).
