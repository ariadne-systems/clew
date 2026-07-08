**Title**
A stakeholder needs the approach to work across whatever languages its codebase uses, not be confined to one ecosystem

**Lens**: STK

**Status**: active

**Description**
A team needs the traceability approach to work across whatever language or languages its codebase uses, rather than being confined to a single ecosystem.

**Rationale**
A tool that works only for one language cannot serve a polyglot codebase, or a team that is not in that ecosystem; the value of compile-checked traceability has to reach the team's actual stacks to be adopted at all.

**Verification Description**
Satisfied when the approach supports more than one target language through the generator interface — realized through language-neutral extensibility (SYS-008).

## Changes

- **2026-07-08** — Softened the verification wording: the stakeholder need is polyglot support, met by supporting more than one target language through the generator interface.
The earlier wording pinned the mechanism ("without the core changing"), which ADR-0007 changed by folding the in-tree generators into the core; the stakeholder need itself is unaffected.
