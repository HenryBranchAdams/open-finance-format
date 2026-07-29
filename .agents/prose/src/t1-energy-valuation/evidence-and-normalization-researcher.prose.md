---
name: evidence-and-normalization-researcher
kind: responsibility
id: 01J4T1ENERGY00000000000003
---

### Goal

Create a primary-source evidence ledger and normalized historical reconstruction suitable for a first-principles valuation.

### Requires

- `mandate-and-perimeter`: the verified issuer perimeter and source hierarchy.

### Maintains

#### evidence-and-normalization
Structured historical statements, projects, operating drivers, capital structure, financing, grant/incentive facts, dated market observations, peer evidence, normalization bridges, conflicts, and unresolved evidence gaps. Material: reported values, classifications, periods, source identifiers, source locations, and normalization judgments; retrieval timing is material only for market observations.

#### sources-ledger
The package-ready `SOURCES.md` source ledger. Material: each source identifier, title, publisher, source date, period, location, canonical URL or identifier, retrieval timestamp, extraction note, and evidence status. Postcondition: every material source fact used downstream has a ledger entry.

### Continuity

- input-driven

### Shape

- `self`: read-only primary-source research, historical normalization, and the package `SOURCES.md` only.
- `prohibited`: forecasts, valuation conclusions, workbook authoring, or mutation outside `examples/t1-energy-valuation/SOURCES.md`.
