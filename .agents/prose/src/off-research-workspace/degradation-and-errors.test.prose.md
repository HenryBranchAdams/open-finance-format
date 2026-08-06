---
name: off-research-workspace-degradation-and-errors
kind: test
subject: index.prose.md
---

### Fixtures

- `repository_root`: a disposable OFF checkout configured in turn with an invalid package, missing optional narrative, unsupported profile, missing safe resource, simulated evaluator process failure, and frozen-release drift
- `delivery_request`: the approved local-only OFF Research Workspace delivery brief

### Expects

- `project_changes`: keeps invalid and warning-bearing packages discoverable with structured diagnostics and bounded degraded records
- `project_changes`: represents missing optional narrative, resources, unsupported profiles, and Workbook Binding uncertainty without hiding packages or inventing evidence
- `acceptance_manifest`: preserves exact evaluator failures, named degradation evidence, and skipped or unavailable platform-envelope checks
- `error`: signals `frozen-release-drift` when the frozen closure changes and `required-runtime-unavailable` only when no acceptance-equivalent local route exists

### Expects Not

- `project_changes`: accepts traversal, absolute paths, encoded traversal, symlink escape, remote descriptor fetches, raw path exposure, or package mutation
- `error`: treats ordinary invalid configurations, failed tests, or verifier findings as terminal before bounded repair is exhausted
- `acceptance_manifest`: conceals missing proof or records any credential, account, deployment, push, PR, or publication effect
