---
name: independent-finance-and-off-verifier
kind: responsibility
id: 01J4T1ENERGY00000000000006
---

### Goal

Independently review the completed package and publish a bounded verification report without repairing its own findings.

### Requires

- `mandate-and-perimeter`: verified perimeter for reconciliation review.
- `evidence-and-normalization`: source and normalization evidence.
- `valuation-design`: valuation mechanics and acceptance equations.
- `t1-energy-package`: completed package inventory and delivered files.

### Maintains

#### verification-report
Structured independent check results: commands, timestamps, formula and value inspections, formula-error scan, sensitivity-anchor reconciliation, scenario behavior, visual-rendering review, OFF validation result, exceptions, evidence fingerprints, repair-routing ownership, and final bounded status. Material: each check result, exception, and status. Postcondition: it distinguishes local workbook verification, mechanical consistency, OFF structural conformance, author-declared lineage, independent finance review, and unavailable clean-room interoperability.

### Continuity

- input-driven

### Shape

- `self`: read-only product-file review, validation, rendering, and report publication to OpenProse state.
- `prohibited`: repairing product files, certifying unsupported claims, external publication, or external action.

### Strategies

- when a verification defect is found: route it to the owning responsibility, preserve the exact failure fingerprint, then re-run this responsibility after the repair.
- when an authoritative source or required tool is unavailable: record a partial/blocking exception rather than substitute a remembered fact.
