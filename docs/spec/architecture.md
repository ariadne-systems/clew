# Architecture and constraints

This document is the framing for the CLI.
It is narrative.
This document explains the shape.
The atomic, anchored architecture rules and constraints are authored as ARCH and CON specs when the architecture they constrain is built; those specs are what the code is checked against.

## Shape

The tool is a language-neutral core with pluggable, language-specific generators.

The core deals only in traceables, ids, the index, content hashes, and resolution.
None of this knows a target language.

A generator turns the set of traceable ids into verifiable symbols in one target language and defines how code references a symbol.
Generators sit behind a narrow interface.
Java and TypeScript are the first two.

The core depends on the generator interface, never on a concrete generator.
This boundary is the one that must not erode.

## Enforcement, in three layers

The core anchors ids language-neutrally.
A language-specific generator materializes them as verifiable symbols.
Existence is enforced by the target language's type-checker where one exists, and by a dedicated build check otherwise.

## Code organization

Domain entity types — the ENT elements of the domain model — live together in one module per package, `core/src/entities`, mirroring `domain-model.md`.
Behaviour that operates on them (the store, services) lives in its own module and imports the entity types.
This gives each domain entity one place in the code and a clear counterpart to anchor, and keeps behaviour separate from the shapes it works on.

## Runtime

The scanner, generators, resolver, and CLI run on Node and ship via npm.
The tool only writes text; it runs no language runtime of its own.

## Locality

The tool runs fully locally when the spec lives in the repo.
A central authority is needed only when identity must be guaranteed across a boundary a per-repo file cannot cover, such as parallel branches with heavy minting or multiple repos against one source.

## Views

These diagrams are views, not the source of truth.
The ARCH and CON specs and the ADRs are what the code is checked against; anchor against them, never against a diagram.
They follow the C4 model's context (C1) and component (C3) levels.
The container level (C2) is omitted — the tool is a single local CLI today; it earns a diagram once the central authority becomes a second running piece.
The code level (C4) is left to the type-checker, which is the truth the tool already borrows.

### Context (C1)

How the tool sits between the people who drive it and the systems it touches.
The defining relationship is that enforcement is *borrowed* from the target language's type-checker rather than reimplemented (ADR-0001 D1, D5).

```mermaid
flowchart TB
    agent["Spec-authoring agent<br/>mints ids · authors anchored specs · asks for scoped context"]
    dev["Developer / CI<br/>scan · generate · verify · resolve"]
    foreign["Foreign spec tools<br/>e.g. SPDD authoring"]

    ariadne["ariadne<br/>language-neutral core + pluggable generators"]

    repo[("Target repository<br/>specs · code · committed index — local")]
    checker["Target type-checker<br/>tsc / javac"]
    authority["Central authority<br/>(future: identity across repos / branches)"]
    npmreg["npm registry"]

    agent -->|mint · anchor · request context| ariadne
    dev -->|run commands| ariadne
    foreign -->|call the mint CLI to embed tokens| ariadne
    ariadne -->|read specs and code · write symbols + index| repo
    ariadne -->|emit verifiable symbols — enforcement borrowed| checker
    ariadne -.->|cross-boundary identity| authority
    ariadne -.->|published to / installed from| npmreg

    classDef person fill:#08427b,color:#fff,stroke:#052e56;
    classDef system fill:#1168bd,color:#fff,stroke:#0b4884;
    classDef external fill:#8a8a8a,color:#fff,stroke:#5f5f5f;
    class agent,dev,foreign person;
    class ariadne system;
    class repo,checker,authority,npmreg external;
```

### Components (C3)

Inside the tool: the CLI is presentation only and delegates to the language-neutral core, which reaches every generator through the generator interface and never through a concrete generator.
That boundary is the one that must not erode (ADR-0001 D9).

```mermaid
flowchart TB
    subgraph cli["@ariadne-thread/cli — presentation"]
        cmds["commands: mint · init · …"]
    end
    subgraph core["@ariadne-thread/core — language-neutral"]
        mintc["mint · id strategies (sequential / opaque)"]
        initc["init · reconcile"]
        store["StateStore — lock + atomic write"]
        cfg["configuration (.ariadnerc.json)"]
        engine["traceables · ids · index · hashing · resolution · scanner"]
        iface{{"generator interface"}}
    end
    genjava["@ariadne-thread/gen-java"]
    gents["@ariadne-thread/gen-typescript"]

    cmds --> mintc
    cmds --> initc
    mintc --> store
    initc --> store
    mintc --> cfg
    initc --> cfg
    engine --> iface
    genjava -. implements .-> iface
    gents -. implements .-> iface

    classDef pkg fill:#1168bd,color:#fff,stroke:#0b4884;
    classDef gen fill:#8a8a8a,color:#fff,stroke:#5f5f5f;
    class cmds,mintc,initc,store,cfg,engine,iface pkg;
    class genjava,gents gen;
```
