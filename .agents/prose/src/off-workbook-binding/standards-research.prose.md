---
name: off-workbook-binding-standards-research
kind: responsibility
id: 01KYDD8RP7EN2964CWC4NZPB2H
---

### Goal

A precise compatibility contract for workbook bindings that composes with OFF Core and optional domain profiles.

### Requires

- `profile-objective`: the bounded outcome, invariants, acceptance criteria, and delivery authority for Workbook Binding

### Maintains

Structured `standards-requirements` covering normative semantics, Google Sheets
snapshot rules, claim boundaries, locator scope, interoperability risks, and
versioning. File paths and line references are evidence and therefore material;
research timestamps and prose ordering are immaterial. Postcondition: every
proposed MUST or MUST NOT is supported by current OFF authority or clearly marked
as new profile semantics.

#### standards-requirements

- Current OFF boundaries and reusable primitives.
- Required semantics for immutable workbook artifacts, mutable live sources, entity bindings, extraction evidence, and calculation metadata.
- Explicit exclusions for execution, financial correctness, legal rights, and live-source availability.
- Minimal clean-room and conformance cases needed to make the new profile implementable.

### Continuity

- input-driven

### Shape

- `self`: read normative OFF specifications, schemas, corpus, examples, strategy, and the supplied Excel/Google Sheets compatibility evidence
- `prohibited`: editing repository files, widening rc.1 in place, making live Google Sheet changes, or claiming source availability not verified
