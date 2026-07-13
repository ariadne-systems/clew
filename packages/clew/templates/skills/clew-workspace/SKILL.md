---
name: clew-workspace
description: "Establish a project's technology contract and prepare its workspace setup on top of clew — interview the user for the stack, fill the 004 technology contract, and draft a workspace-setup story for the agent to execute after promotion. Use after clew-setup, when the 004 is still an empty stub and the user wants to establish the stack or bootstrap the project. Not clew configuration (clew-setup) or general spec authoring (clew-draft)."
---

# clew-workspace

After clew is configured, establish the project's **technology contract** and prepare its **workspace setup** — by interviewing the user, filling the `004` technology contract, and drafting a workspace-setup story.

This skill produces two artifacts: a filled `004` and a **draft** setup story.
It does not build the workspace itself — that is the story's job, once the user has promoted it.
The split is deliberate: setting up a workspace changes the project materially, so the human reviews and promotes before anything runs.

## When to use

- After `clew-setup`, when `clew setup` has seeded the `004` technology contract as an empty stub and the user wants to establish the stack (Spring Boot, TypeScript, …) or bootstrap the workspace.
- The user asks to "set up the project", "choose the stack", or "fill the tech contract".

## What you must not do

- Do not build the workspace here — no dependency installs, no build/test/lint configuration, no application skeleton. This skill only fills the `004` and drafts the story.
- Do not rely on training memory for versions or conventions — verify the current release and convention of each tool from its own documentation. Conventions churn.
- Do not decide what is the developer's to decide — architecture, tooling, project structure. Ask; record the answer in the `004`.
- Do not promote or execute the story, and do not commit. Leave promotion to the user (`clew-promote`) and commits to the user.

## Precondition

`.clewrc.json` exists and `clew setup` has run (the `004` stub is present). If not, use the `clew-setup` skill first.

## Procedure

### 1. Interview

Ask the user, one concern at a time:

- The stack and its framework (for example "Spring Boot", "TypeScript / Node", "Go"). The name is the stack, not just the language.
- Build tool, and the testing libraries they want — or accept the stack's common defaults.
- Any coding or testing conventions they want enforced.
- Their architecture leaning — but treat this as *theirs* to decide, not yours to impose; record what they say, and leave it open where they are unsure.

### 2. Verify current standards

For each tool the answers name, check its current stable release and its current convention **from the tool's own docs, not from memory**. This is what keeps the contract off stale versions.

### 3. Fill the `004`

Write the technology contract into the seeded `004` stub, project-owned.
Keep it to the **stack** — runtime and core libraries — and leave architecture, tooling, and quality gates to the project unless the interview pinned them. See the worked example below for the shape and altitude.

### 4. Draft the workspace-setup story

Temp-mint a story id (`clew mint --tmp <story-prefix>`) and write a **draft** "set up the workspace" story into the drafts location, whose steps instruct the agent to:

1. read the project's `004`;
2. verify the current standards of the tools it names (docs, not memory);
3. where the `004` is unclear or leaves a decision to the developer, ask the user — a short interview, not a guess;
4. set up the workspace accordingly (dependencies, build, test, lint).

### 5. Stop for review

Present the filled `004` and the draft story.
The user reviews, promotes the story (`clew-promote`), and only then has the agent execute it.

## The `004` shape — worked example (Spring Boot)

Keep the contract this lean: the stack, not the architecture and not the tooling.

```markdown
# Technology Contract — Spring Boot

The stack a Spring Boot service is built on.
Pin exact versions in the build (`pom.xml`), and resolve the current release of
each from its own release page at setup time — do not assume from memory.

## 1. Runtime
- Java — the current LTS.
- Spring Boot — the current stable release.
- Maven.

## 2. Approved libraries
- Testing: JUnit 5 (Jupiter), Mockito, AssertJ.
- Lombok (`@Getter`, `@RequiredArgsConstructor`), where it earns its place.

## 3. What this contract does not decide
The architecture — layering, ports and adapters, module boundaries — is the
project's decision, captured in its architecture overview and its ARCH/CON specs.
Static analysis, coverage, integration-test infra, and further libraries are the
project's to add as needed. This contract stays to the stack.
```

## Done when

- The `004` is filled from the interview and the verified current standards, tailored to the project.
- A **draft** workspace-setup story exists with a temporary id, carrying the read → verify → interview → set-up steps.
- Both are presented for review; nothing is promoted, executed, or committed.
