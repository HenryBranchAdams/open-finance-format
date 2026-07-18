---
name: Open Finance Format (OFF)
last_updated: 2026-07-17
---

# Open Finance Format (OFF) Strategy

## Target problem

Independent public-markets analysts struggle to publish detailed financial models in a form that remains portable, mobile-readable, source-backed, auditable, and easy to inspect, cite, or challenge. Models span opaque spreadsheets, prose, data sources, and changing assumptions, while existing publishing and social platforms reduce them to static files, screenshots, or oversimplified posts that quickly become stale and lose their provenance.

## Our approach

OFF treats a financial model as a portable, versioned research object, binding its calculations and narrative to stable assumptions, outputs, sources, lineage, freshness, and presentation metadata. Spreadsheets remain the authoring tool; OFF supplies an open publishing layer that lets any compatible viewer or agent render, audit, cite, update, compare, and eventually fork the analysis.

## Who it's for

**Primary:** Independent public-markets analysts and serious FinTwit/FinX investors who build models in spreadsheets and publish investment theses publicly. They hire OFF to turn a workbook and supporting research into a credible, mobile-readable artifact that others can inspect, verify, cite, compare, and challenge—without manually building a website or reducing the analysis to screenshots and posts.

## Key metrics

- **Time to publish** — Median time required to convert an existing workbook into a publishable OFF package; measured through publisher event logs and structured usability tests.
- **Audit coverage** — Percentage of headline outputs connected to stable IDs, assumptions, sources, freshness status, and lineage; measured through OFF validator reports and package manifests.
- **Cross-render success** — Percentage of packages successfully interpreted by at least two independent viewers or agents; measured through the conformance suite, validator runs, and renderer tests.
- **Meaningful inspection rate** — Percentage of readers who examine assumptions, sources, lineage, or the native workbook instead of stopping at the summary; measured through privacy-conscious publisher analytics.
- **Stale-input remediation rate** — Percentage of published models receiving a new immutable release within a defined period after a material input becomes stale; measured through registry metadata, version history, and freshness checks.

## Tracks

### Open Specification & Conformance

Define the package, profiles, stable IDs, versioning, lineage, freshness semantics, and validation tests.

_Why it serves the approach:_ Establishes OFF as interoperable infrastructure rather than a proprietary publishing feature.

### Authoring & Conversion

Provide templates, recipes, agent skills, and repair tools that convert existing spreadsheets and research into conforming packages.

_Why it serves the approach:_ Reduces time to publish while maintaining audit coverage—the primary adoption constraint.

### Publishing & Inspection

Render OFF packages as accessible mobile web pages, native-file viewers, documents, PDFs, embeds, and immutable citations.

_Why it serves the approach:_ Gives readers a materially better way to understand and inspect models while proving cross-render interoperability.

### Lifecycle & Refresh

Monitor source freshness, identify affected outputs, support updated immutable releases, and compare versions.

_Why it serves the approach:_ Keeps models useful after publication and directly drives stale-input remediation.

## Not working on

- **No new spreadsheet or calculation runtime:** OFF standardizes publishing and auditability around existing models.
- **No social network yet:** Feeds, comments, reputation, discovery, and challenges wait until a useful supply of maintained OFF models exists.
- **No trading terminal or execution product:** Despite the Market Terminal design language, OFF remains research-publishing infrastructure—not a live-data, brokerage, or recommendation system.

## Marketing

**One-liner:** Open Finance Format (OFF) is an open standard for publishing financial models as portable, versioned, source-backed research objects.

**Key message:** Publish the model, not just the spreadsheet.
