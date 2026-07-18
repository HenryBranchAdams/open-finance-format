# Superseded planning decision register

> Historical only. Current product authority is [`../STRATEGY.md`](../STRATEGY.md); current rc.1 authority is the [implementation-ready plan](plans/2026-07-17-001-feat-off-v0-1-layered-conformance-corpus-plan.md) and [`../spec/`](../spec/). Generated manifests, Presentation conformance, and unqualified Auditable terminology below are superseded.

This file distinguishes decisions already made from recommendations that remain reversible.

## Locked by the owner

### Publishing and access

- Default publishing experience: responsive, mobile-first Sites/web page.
- Native XLSX/DOCX/PDF viewer: secondary inspection experience.
- Initial interaction mode: read-only.
- Future adjustable assumptions and richer interaction are explicitly desired.
- Public sharing should be unlisted rather than private/authenticated initially.
- Immutable, version-pinned links are the default for citations.
- An optional `/latest` link may follow the newest release.

### Artifact quality

- The artifact must be structured, traceable, and auditable.
- Readers should be able to see whether a model input is stale.
- Freshness should propagate through dependencies so outputs calculated from stale data are flagged.
- The package should support embedding or sharing from external surfaces such as Substack and X.
- Spreadsheets, documents, PDFs, and web presentations should share a coherent visual identity.
- Mobile phone aspect ratios must be treated as a primary constraint.

### Project posture

- The name is **Open Finance Format (OFF)**.
- The standard should be open source and agent-friendly.
- It should not require proprietary APIs or complex SDKs for basic use.
- A future hosted/social platform may be built on top of the open framework.
- Recipes, starter packs, themes, and visual-quality safeguards are desirable.
- Implementation is authorized for the bounded v0.1-rc.1 plan; later product tracks remain deferred.

### Reference design

- The reference design direction is **Market Terminal**.
- The style must be adapted for responsive mobile reading and the Extend UI viewer architecture.
- Market Terminal is a presentation profile and reference implementation choice, not a semantic requirement of OFF itself.
- The experience must remain a genuine expert information system, not a generic dashboard or decorative cyberpunk interface.

## Historical recommendations

These have not been formally approved but are the current working direction.

- Separate the standard name from the eventual platform name.
- Standardize the research package before attempting to standardize calculations.
- Use profiles: Core, Public Equity, Presentation, and later Execution.
- Use `MODEL.md` as the predictable human/agent entrypoint.
- Use Markdown for narrative and JSON/YAML for dense structured metadata.
- Include a deterministic `model-manifest.json` for consumers.
- Distinguish structural validation from editorial/presentation linting.
- Use factual conformance levels: Valid, Publishable, Auditable, Executable.
- Default hosted viewing should reject or quarantine macros and unsafe external connections.
- Allow unknown extension fields so older consumers do not fail unnecessarily.
- Require stable semantic IDs for inputs, outputs, scenarios, and sources at the Auditable level.
- Treat themes and recipes as optional packages layered above the core specification.

## Explicitly deferred

- Universal formula language or calculation DSL.
- Choice of web framework or database.
- Social feed design.
- Monetization.
- Formal governance foundation.
- Reputation scoring.
- Private models and enterprise permissions.
- Real-time collaboration.
- Broker integrations or trade execution.
- Automated investment recommendations.

## Naming notes

- The chosen standard name is **Open Finance Format (OFF)**.
- `FinCrate` should be avoided because it is already used by an embedded-finance platform.
- Platform candidates: ModelThread, Countercase, Thesis Exchange, ModelPost.
- No candidate has received trademark or domain clearance.

## Tooling note

The owner previously requested use of `openai-templates@openai-curated-remote`. That plugin was not available as an installed callable capability in the session that produced this handoff. A future implementation agent should check whether it is available before building templates.
