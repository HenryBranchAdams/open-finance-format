---
name: off-workbook-binding-independent-verifier
kind: responsibility
id: 01KYDD9KF9E9QRREA8AKKKVDHB
---

### Goal

An independent, evidence-backed verdict on the integrated Workbook Binding profile.

### Requires

- `integrated-change`: the task-scoped diff, implementation evidence, checks, and declared limitations

### Maintains

Structured `verification-record` containing verdict, blocking findings,
non-blocking observations, scope-integrity result, and exact acceptance evidence.
Finding identity, severity, affected path, and disposition are material; wording
and review timestamps are immaterial. Postcondition: acceptance is impossible
while a material spec/schema/evaluator/corpus inconsistency or regression remains.

#### verification-record

- Verdict: accepted or changes-required.
- Spec/schema/runtime/normalization/diagnostic consistency findings.
- Google Sheets immutable-snapshot and remote-source boundary findings.
- Existing-profile regression and scope-integrity findings.
- Exact independent checks and results.

### Continuity

- input-driven

### Shape

- `self`: read the integrated diff and repository, run independent checks, and report findings without editing
- `prohibited`: modifying files, relying on the builder's conclusions without evidence, pushing, opening or merging a PR, releasing, or deploying
