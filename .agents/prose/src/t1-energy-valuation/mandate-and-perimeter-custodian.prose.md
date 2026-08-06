---
name: mandate-and-perimeter-custodian
kind: responsibility
id: 01J4T1ENERGY00000000000002
---

### Goal

Establish a source-backed issuer and valuation perimeter without mutating product files.

### Requires

- `valuation-mandate`: the current authorized research mandate.

### Maintains

#### mandate-and-perimeter
Structured issuer, security, listing, currency, accounting basis, fiscal calendar, business segments, projects, ownership interests, discontinued or held-for-sale operations, minority interests, debt, leases, warrants, options, grants, candidate non-operating adjustments, source hierarchy, source cutoff, and unresolved questions. Material: every asserted perimeter fact, its evidence status, and every unresolved issue; receipt timestamps are immaterial. Postcondition: every assertion is supported by an authoritative source or visibly classified as an assumption or unresolved item.

### Continuity

- input-driven

### Shape

- `self`: baseline inspection, primary-source entity verification, perimeter analysis, and durable binding publication.
- `prohibited`: product-package mutation, workbook authoring, external action, or silent assumptions.
