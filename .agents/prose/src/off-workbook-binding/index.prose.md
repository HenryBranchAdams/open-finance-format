---
name: off-workbook-binding-delivery
kind: responsibility
id: 01KYDD9KFBF1TVWMSXAHSRJTCC
---

### Goal

An independently verified Workbook Binding profile is delivered as a focused draft pull request.

### Requires

- `verification-record`: independent verdict, findings, scope result, and exact acceptance evidence

### Maintains

Structured `pr-delivery-record` containing branch, commit, remote push state,
pull-request URL/state, validation summary, and residual risks. Identifiers and
outcomes are material; timestamps and prose ordering are immaterial. Postcondition:
no commit, push, or pull request is created unless verification is accepted and
the staged diff contains only task-owned files.

#### pr-delivery-record

- Branch and commit identifiers.
- Explicit staged-file scope.
- Push outcome and remote branch.
- Draft pull-request URL, base/head, title, and concise body summary.
- Validation evidence and remaining non-blocking risks.

### Continuity

- input-driven

### Tools

- `cli:git`: local Git delivery workflow
- `cli:gh`: GitHub pull-request fallback when connector coverage is unavailable

### Shape

- `self`: inspect final diff, stage task-owned files, commit, push, and open a draft PR after an accepted verification record
- `prohibited`: merging the PR, publishing a release, deploying, rewriting history, staging unrelated work, or bypassing repository protections
