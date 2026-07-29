---
name: workbook-and-package-builder
kind: responsibility
id: 01J4T1ENERGY00000000000005
---

### Goal

Build the formula-driven workbook and OFF Public Equity Research package from the completed upstream bindings.

### Requires

- `mandate-and-perimeter`: the verified perimeter.
- `evidence-and-normalization`: normalized financial and operating evidence.
- `sources-ledger`: package-ready primary-source ledger.
- `valuation-design`: selected methods, assumptions, and acceptance equations.

### Maintains

#### t1-energy-package
Structured inventory of the completed package: paths, bytes, SHA-256 digests, manifest outputs, lineage, source cutoff, workbook sheet map, checks, and known exclusions. Material: every resource hash, headline output, declared dependency, status, and known limitation. Postcondition: resources match the exact delivered files and `off.json` is normative.

### Continuity

- input-driven

### Shape

- `self`: mutate only `examples/t1-energy-valuation/`; author the workbook solely through `spreadsheets:Spreadsheets`; build `OFF.md`, `off.json`, supporting model notes, and package inventory.
- `prohibited`: modifying upstream source ledger ownership, repository configuration, immutable release trees, staging, committing, pushing, publishing, or external actions.
