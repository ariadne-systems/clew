---
"@ariadne-thread/clew": patch
---

Repurpose the `clew-setup` skill into the project-bootstrap flow. After the `clew setup` command scaffolds the project, the `clew-setup` skill interviews the user for the stack and the architecture, verifies the current standards from the tools' own docs, fills the `004` technology contract and `docs/spec/architecture.md`, and drafts a workspace-setup story for the agent to execute once the user promotes it — leaving no scaffolded document with an open question. The `clew setup` command's next-steps point to it, and no step tells the user to mint ids by hand.
