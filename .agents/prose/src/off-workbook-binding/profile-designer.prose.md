---
name: off-workbook-binding-profile-designer
kind: responsibility
id: 01KYDD8RP7ESMT8Q9X2FBSFHVV
---

### Goal

A complete, minimal Workbook Binding 0.1 contract ready for direct implementation.

### Requires

- `standards-requirements`: normative compatibility requirements and claim boundaries
- `implementation-map`: current code ownership, validation flow, test seams, and release constraints

### Maintains

Structured `profile-contract` defining the profile URI, closed data shapes,
reference rules, normalization, diagnostics, claims, Google Sheets snapshot
semantics, conformance fixtures, and documentation obligations. Contract fields,
rule ordering, and acceptance cases are material; explanatory phrasing is
immaterial. Postcondition: a builder can implement the contract without inventing
meaning, and a clean-room consumer can distinguish local immutable artifacts from
remote mutable sources.

#### profile-contract

- Profile identity and compositional boundary.
- Workbook, locator, binding, calculation-state, and extraction-attestation entities.
- Cross-reference, uniqueness, local-resource, digest, and Google Sheets snapshot requirements.
- Deterministic normalization and diagnostic precedence.
- Valid, invalid, and boundary conformance examples.
- Explicit non-claims and deferred features.

### Continuity

- input-driven

### Shape

- `self`: synthesize and resolve conflicts in the two upstream truths
- `prohibited`: editing implementation files, weakening Core resource integrity, requiring spreadsheet execution, or changing the existing rc.1 release tree
