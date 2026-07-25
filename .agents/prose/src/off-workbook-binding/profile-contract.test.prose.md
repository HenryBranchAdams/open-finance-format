---
name: off-workbook-binding-profile-contract-test
kind: test
subject: profile-designer.prose.md
---

### Fixtures

- `standards-requirements`: OFF Core resources are opaque and integrity-bound; Google Sheets are mutable remote sources and require an immutable local snapshot for reproducible outputs; execution and legal truth are out of scope.
- `implementation-map`: add an optional profile through the existing schema/evaluator/normalization/diagnostic/corpus seams without editing the rc.1 release closure.

### Expects

- `profile-contract`: defines a closed, optional profile that composes with Core and domain profiles.
- `profile-contract`: distinguishes a locally verified immutable workbook artifact from an optional mutable Google Sheets source descriptor.
- `profile-contract`: supplies enough deterministic reference, normalization, diagnostic, and conformance behavior for implementation.

### Expects Not

- `profile-contract`: requires spreadsheet execution or claims financial correctness, legal rights, live-source availability, or cross-engine equivalence.
- `profile-contract`: silently changes OFF Core or Public Equity semantics.
