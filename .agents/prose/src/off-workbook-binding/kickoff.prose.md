---
name: off-workbook-binding-kickoff
kind: gateway
id: 01KYDD8RP6FPF9AAEW23NFJGQP
---

### Goal

The requested OFF Workbook Binding profile is expressed as a bounded, testable,
reviewable repository change with explicit delivery authority.

### Continuity

- external-driven

### Receives

- Manual activation from the repository owner requesting implementation and a pull request.

### Maintains

Structured `profile-objective` truth containing the desired outcome, scope,
invariants, acceptance criteria, and authority boundaries. Field ordering and
activation timestamps are immaterial; the requested semantics and boundaries are
material. Postcondition: the objective requires Excel and Google Sheets support
without treating a mutable remote sheet as an immutable artifact.

#### profile-objective

- Outcome: implement an optional OFF Workbook Binding profile and submit a pull request.
- Scope: normative specification, schema, evaluator behavior, diagnostics, normalization, conformance fixtures, tests, and documentation required for a coherent profile.
- Invariants: Core remains artifact-agnostic; Public Equity remains authoring-tool-agnostic; spreadsheet execution and financial correctness remain outside conformance; the existing rc.1 release closure is not rewritten.
- Acceptance: local checks pass, an independent verifier accepts the integrated diff, and the PR accurately separates structural binding from recalculation or legal claims.
- Authority: create an isolated branch, edit the repository, commit, push, and open a draft pull request; do not merge, release, deploy, or publish elsewhere.

### Emits

- off-workbook-binding-standards-research
- off-workbook-binding-codebase-map

### Shape

- `prohibited`: merging the pull request, publishing a release, deployment, destructive history edits, or modifying unrelated user work
