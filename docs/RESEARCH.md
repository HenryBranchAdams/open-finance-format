# Research notes and sources

This is a curated starting point rather than an exhaustive landscape review. Prefer primary or official sources when extending it.

## Open Knowledge Format

Google Cloud introduced Open Knowledge Format in June 2026 as a vendor-neutral, human- and agent-friendly format. Its central idea is deliberately lightweight: directories of Markdown documents with YAML frontmatter, without a required runtime, SDK, or proprietary API.

What to borrow:

- predictable, readable files;
- Git-native distribution;
- low adoption cost;
- progressive disclosure;
- agent friendliness without making agents mandatory.

Source:

- https://cloud.google.com/blog/products/data-analytics/how-the-open-knowledge-format-can-improve-data-sharing
- https://okf.md/

## RO-Crate

RO-Crate packages research objects and their context using extensible metadata. Its profile mechanism allows domain communities to specify additional expectations while preserving a general core.

What to borrow:

- package as a graph of related resources;
- profiles with versioned identifiers;
- declared conformance;
- support for files and remote resources;
- provenance and durable identifiers.

Sources:

- https://www.researchobject.org/ro-crate/specification.html
- https://www.researchobject.org/ro-crate/specification/1.3/profiles.html

## Frictionless Data Package

Data Package uses a small descriptor and an inventory of resources. It distinguishes a general package from specialized profiles.

What to borrow:

- simple package descriptor;
- local and remote resources;
- schema-based validation;
- domain profiles rather than an oversized universal schema.

Sources:

- https://specs.frictionlessdata.io/data-package/
- https://specs.frictionlessdata.io/profiles/

## W3C PROV

The W3C provenance family defines interoperable concepts for entities, activities, agents, and derivations.

What to borrow:

- compatible provenance concepts;
- explicit derivation and responsibility;
- separation of the thing, the process that changed it, and the responsible agent.

Do not require ordinary financial-model authors to write RDF. Use a finance-friendly representation that can map to the conceptual model.

Source:

- https://www.w3.org/TR/prov-o/

## OCI manifests

The Open Container Initiative provides a mature precedent for content-addressable artifacts, manifests, indexes, and typed resources.

What to borrow:

- cryptographic content identity;
- immutable components;
- manifests referencing typed artifacts;
- one logical package with multiple platform/rendering variants;
- safe extensibility and unknown-field tolerance.

Sources:

- https://specs.opencontainers.org/image-spec/manifest/
- https://specs.opencontainers.org/image-spec/image-layout/

## SPDX

SPDX is an open standard for communicating software component, provenance, license, security, and related supply-chain information.

What to borrow:

- standardized license identifiers;
- clear separation of inventory, provenance, and verification facts;
- factual transparency rather than vague trust labels.

Source:

- https://spdx.dev/about/overview/

## FAST Standard

FAST promotes financial models that are Flexible, Appropriate, Structured, and Transparent. The standard is available under CC BY 4.0.

What to borrow:

- established financial-modeling vocabulary;
- emphasis on simple, inspectable structures;
- compatibility with existing modeling practices;
- permissive access to standards material.

Sources:

- https://www.fast-standard.org/
- https://www.fast-standard.org/fast-standard-creative-commons-licence/

## AGENTS.md and llms.txt

Both demonstrate the power of predictable, plain-text entrypoints and conventions that tools can adopt incrementally.

What to borrow:

- memorable filename;
- useful even before universal tool support;
- human readability;
- no central service required;
- reference examples and integrations that drive adoption.

Sources:

- https://github.com/agentsmd/agents.md
- https://llmstxt.org/index.html

## Extend UI

Extend UI provides customizable viewer components for PDF, DOCX, XLSX, and CSV. Its XLSX viewer supports workbook tabs, frozen panes, formulas, navigation, selection, and zoom. The source-copying model makes it suitable for a customizable reference publisher.

Important limitation: a native workbook viewer does not make a wide financial model genuinely mobile-responsive. A separate mobile reader remains necessary.

Sources:

- https://www.extend.ai/ui
- https://www.extend.ai/ui/docs/components/xlsx-viewer
- https://github.com/extend-hq/ui

## Substack constraints

Substack does not permit arbitrary custom CSS/HTML or normal-post iframes. It supports file attachments such as XLSX and PDF, but those appear as downloads rather than a full interactive viewer.

Practical implication: use a social/summary preview linking to the hosted model, with an optional attachment. Do not base the initial distribution strategy on arbitrary iframe embeds inside Substack.

Sources:

- https://support.substack.com/hc/en-us/articles/360037463152-Can-I-edit-the-CSS-or-HTML-on-Substack
- https://support.substack.com/hc/en-us/articles/4408381643156-How-can-I-attach-a-file-to-my-Substack-post

## Market Terminal reference design

The reference design uses Market Terminal as a cross-vendor descriptive style: persistent panes, compact aligned financial data, semantic color on a dark field, strong keyboard state, and brief meaningful update indications. Bloomberg is the canonical specimen, while LSEG Workspace demonstrates the broader professional-workspace category.

What to borrow:

- persistent context and dense professional workflows;
- finance-specific numerical typography;
- thin hard divisions rather than floating cards;
- semantic, accessible color;
- restrained motion tied to real updates;
- user-adjustable workspaces and density.

What to avoid:

- decorative cyberpunk effects;
- superficial “Wall Street” telemetry;
- generic dashboard card grids;
- color-only state;
- microscopic text presented as expertise.

Sources:

- https://www.bloomberg.com/company/stories/bloombergs-customer-centric-design-ethos/
- https://www.bloomberg.com/company/stories/how-bloomberg-terminal-ux-designers-conceal-complexity/
- https://www.bloomberg.com/company/stories/designing-the-terminal-for-color-accessibility/
- https://www.lseg.com/en/data-analytics/products/workspace/data-and-content

## Research topics still needed

- X card and embed behavior for ordinary public posts;
- identifiers for securities and issuers, including licensing constraints;
- spreadsheet malware and formula-injection threat models;
- financial-data redistribution and excerpting rights;
- model licensing precedents;
- forecast scoring and public track-record systems;
- moderation patterns for investment communities;
- existing open-source financial-model repositories and why they did or did not gain adoption;
- trademark and domain review for candidate names.
