# Open Finance Format v0.1 — superseded planning draft

> Historical only. The normative rc.1 contracts are [`../spec/OFF-Core-0.1.md`](../spec/OFF-Core-0.1.md), [`../spec/profiles/public-equity-research-0.1.md`](../spec/profiles/public-equity-research-0.1.md), and their companion normalization, diagnostics, and conformance documents. The `MODEL.md`, `model-manifest.json`, Presentation profile, and unqualified Auditable proposals below are not current conformance requirements.

This is a preserved product/specification outline, not a normative release.

Normative terms such as MUST, SHOULD, and MAY are used to clarify intent, but requirements remain provisional until the owner approves a formal specification.

## 1. Scope

Open Finance Format (OFF) defines how to package and describe public financial research. It does not define whether the research is correct and does not initially define a universal calculation engine.

The v0.1 design should support:

- filesystem directories;
- Git repositories;
- archive downloads;
- static web hosting;
- hosted viewers and registries;
- multiple related artifacts and renderings.

## 2. Illustrative package

```text
company-model/
├── MODEL.md
├── model-manifest.json
├── research/
│   ├── thesis.md
│   ├── assumptions.md
│   ├── outputs.md
│   └── methodology.md
├── metadata/
│   ├── sources.json
│   ├── lineage.json
│   └── reader.json
├── artifacts/
│   ├── model.xlsx
│   ├── memo.docx
│   └── report.pdf
└── previews/
    ├── social-1200x630.png
    └── mobile-1080x1350.png
```

Only a small subset should be required for minimal conformance.

## 3. Core identity

A valid package should declare:

- specification identifier and version;
- stable model ID;
- title and short description;
- author or publishing entity;
- model version;
- publication timestamp;
- license;
- at least one artifact or usable research resource.

Recommended fields:

- canonical release URL;
- latest-version URL;
- repository URL;
- content hashes;
- authorship identifiers;
- disclosures;
- extension namespaces.

## 4. Artifact inventory

Every declared artifact should have:

- stable resource ID;
- path or URL;
- media type;
- role, such as workbook, memo, dataset, preview, or reader definition;
- content hash when immutable;
- size when known;
- generated or authored status;
- relationship to other resources.

Consumers should ignore unknown optional resource roles rather than reject the package.

## 5. Public Equity Profile

The first domain profile should support:

### Security identity

- issuer name;
- ticker;
- exchange;
- security type;
- currency;
- optional ISIN, CUSIP, FIGI, or other identifiers.

### Analytical context

- valuation/as-of date;
- fiscal calendar and reporting basis;
- thesis summary;
- variant perception;
- catalysts;
- risks;
- methodology;
- disclosed position or conflict status.

### Scenarios

- stable scenario ID;
- label and description;
- base/bull/bear role when applicable;
- scenario-specific overrides;
- probability, if the author uses explicit probability weighting.

### Inputs and assumptions

- stable semantic ID;
- label and description;
- type;
- value;
- unit and currency where relevant;
- effective date;
- scenario applicability;
- allowed range or validation rule when interactive;
- source or analyst-assumption classification;
- source references;
- last-reviewed date for analyst judgments.

### Outputs

- stable semantic ID;
- label and description;
- value, unit, and currency;
- scenario applicability;
- dependency references;
- display priority;
- calculation status;
- freshness status.

Stable IDs must not depend on cell coordinates. A workbook adapter may map a stable ID to a named range or cell, but moving a cell must not change the public identity of the assumption or output.

## 6. Sources and freshness

Each factual source record should support:

- source ID;
- title and publisher;
- canonical URL or document identifier;
- content hash when available;
- effective date;
- retrieval timestamp;
- expected refresh policy;
- next expected publication date when known;
- stale-after rule;
- current, aging, stale, or unknown status;
- licensing or redistribution notes.

Freshness should be evaluated relative to expected cadence. An annual filing may remain current for months, while a quoted market price may become stale within minutes or days.

Analyst assumptions should use a last-reviewed policy rather than pretending to originate from an external data source.

## 7. Lineage

Lineage should describe dependencies among semantic entities, not only spreadsheet cells.

At the Auditable level:

- outputs should reference the material inputs and intermediate calculations they depend upon;
- derived freshness should inherit the worst material dependency status;
- consumers should be able to explain why an output is flagged;
- dependencies may reference external sources, assumptions, calculations, or other outputs;
- circular dependencies should be declared or rejected according to the applicable execution rules.

The vocabulary should remain compatible in spirit with W3C PROV concepts such as entities, activities, agents, and derivations, without requiring every author to understand RDF.

## 8. Presentation Profile

The Presentation Profile should declare:

- primary mobile summary sections;
- headline outputs;
- chart or table specifications;
- theme reference or token overrides;
- workbook/document viewer resources;
- preview images;
- canonical, summary, viewer, download, and embed URLs;
- supported display modes.

Recommended display modes:

- `summary` — thesis and key valuation outputs;
- `full` — complete responsive research page;
- `viewer` — native artifact inspection;
- `embed` — constrained external presentation.

The specification should not require Extend UI or ChatGPT Sites. They may be used by a reference implementation.

## 9. External sharing

A hosted release should expose:

- immutable release URL;
- optional latest URL;
- canonical metadata;
- social-preview image;
- viewer URL;
- direct artifact download URL;
- optional oEmbed discovery or endpoint;
- machine-readable manifest URL.

Substack does not currently permit arbitrary custom iframe/HTML inside normal posts, so the practical Substack experience is likely a preview image or summary card linking to the hosted model, with optional file attachment. X should initially be treated similarly: a rich preview and canonical link, not assumed arbitrary interactive embedding.

## 10. Conformance levels

### Valid

- core identity fields;
- license and version;
- at least one artifact;
- syntactically valid manifest.

### Publishable

- relevant domain profile;
- thesis summary;
- headline inputs and outputs;
- sources;
- reader metadata;
- mobile/social preview.

### Auditable

- stable semantic IDs;
- content hashes;
- source freshness policies;
- dependency lineage;
- explainable propagated status;
- validation checks.

### Executable — future

- typed adjustable inputs;
- supported calculation graph;
- deterministic recalculation;
- output verification fixtures;
- declared execution environment.

A package may conform to multiple profiles. Conformance claims must identify the exact profile and version.

## 11. Safety and public-hosting policy

The base specification may describe arbitrary artifacts, but a hosted-viewer profile should clearly flag or reject:

- VBA or executable macros;
- unsafe external connections;
- embedded executable content;
- formula injection risks;
- unsupported or unverifiable calculation features;
- password-protected artifacts that cannot be inspected;
- undeclared proprietary or restricted data;
- mutable artifacts presented as immutable releases.

Unsafe packages may remain valid as packages while being ineligible for trusted hosted rendering.

## 12. Extensibility and compatibility

- Specification and profile versions should use semantic versioning.
- Profiles should have durable, resolvable identifiers.
- Custom extensions should use namespaces.
- Consumers should preserve or ignore unknown optional fields.
- A core package should not require a registry account.
- The standard should be implementable without network access after package retrieval.

## 13. Validation boundary

A validator may establish:

- syntactic validity;
- declared profile conformance;
- resource availability and hash integrity;
- completeness of required metadata;
- freshness-rule results;
- lineage completeness;
- deterministic calculation test results.

A validator must not claim:

- that a valuation is intrinsically correct;
- that a source is truthful merely because it is declared;
- that an author is unbiased;
- that a security is suitable for investment;
- that a conforming package constitutes investment advice.

## 14. Success condition for v0.1

The proposal should not be called an interoperable standard until at least two independently implemented consumers or publishers can exchange the same package successfully.
