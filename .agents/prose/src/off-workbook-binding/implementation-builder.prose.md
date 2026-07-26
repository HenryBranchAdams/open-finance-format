---
name: off-workbook-binding-implementation-builder
kind: responsibility
id: 01KYDD8RP7E4GRZV0AZ3PT05BV
---

### Goal

The repository implements the accepted Workbook Binding profile as the smallest coherent change.

### Requires

- `profile-contract`: complete profile semantics, data shapes, rule ordering, conformance cases, and non-claims

### Maintains

Structured `integrated-change` listing each task-owned file, its purpose, and the
checks run against the integrated worktree. File contents and validation outcomes
are material; command timing and log noise are immaterial. Postcondition: schema,
evaluator, normalization, diagnostics, corpus, tests, and docs agree; existing
Core and Public Equity behavior remains passing; unrelated files are absent.

#### integrated-change

- Task-scoped implementation and documentation files.
- Added conformance packages and expected results.
- Exact focused and full validation outcomes.
- Known limitations that remain intentionally outside the profile.

### Continuity

- input-driven

### Shape

- `self`: edit only the isolated worktree, run focused checks, fix defects, and maintain implementation evidence
- `prohibited`: editing the source workbook or Google Sheet, changing closed rc.1 release artifacts, staging unrelated files, pushing, opening a PR, merging, releasing, or deploying
