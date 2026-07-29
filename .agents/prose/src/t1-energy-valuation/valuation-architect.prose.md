---
name: valuation-architect
kind: responsibility
id: 01J4T1ENERGY00000000000004
---

### Goal

Select methods and define a coherent, company-specific valuation design from verified economics.

### Requires

- `mandate-and-perimeter`: the verified issuer perimeter.
- `evidence-and-normalization`: the normalized historical and operating evidence.

### Maintains

#### valuation-design
Structured method hierarchy, inapplicable-method rationale, operating-driver map, analyst assumptions, scenario narratives, discount-rate design, project probability or option treatment, peer methodology, enterprise-to-equity bridge, diluted-share design, reverse-valuation equation, sensitivity acceptance equations, and open issues. Material: any method, input, assumption, scenario, or equation that changes outputs. Postcondition: every material forecast line maps to a source fact, explicit policy, or labeled analyst assumption; consensus is comparison-only.

### Continuity

- input-driven

### Shape

- `self`: method selection, assumptions, scenario design, and binding publication.
- `prohibited`: package/workbook mutation, external action, consensus-derived forecast inputs, or unsupported project probabilities.
