# Roadmap

This roadmap separates local format implementation, external interoperability proof, and later product adoption. Dates are intentionally omitted.

## Current release line — experimental v0.1-rc.1

The current candidate implements the public contract around off.json, the sole normative manifest. It defines exactly two normative profiles:

- **OFF Core 0.1** for package identity, releases, resource inventory, local integrity, declared profiles, relationships, and canonical handoff; and
- **OFF Public Equity Research 0.1** for public-equity entities, freshness, and **Traceable — author-declared lineage**.

The repository includes normative specifications, JSON Schemas, a deterministic normalizer and reference evaluator, one minimal Core package, one synthetic Traceable package evaluated at current and stale timestamps, focused invalid fixtures, and hand-reviewed normalized expectations and diagnostics.

The local corpus is offline. Structural evaluation makes no network requests, and remote resource descriptors remain not evaluated.

### Local release-candidate acceptance

Before any public candidate is treated as ready for a clean-room attempt:

1. type checking, unit tests, corpus verification, documentation checks, offline-copy verification, and release validation must pass;
2. the checked-in distribution must reproduce the hand-reviewed corpus without installing dependencies or contacting the network;
3. the release allowlist and checksums must identify the immutable public artifacts; and
4. every external evidence field must remain pending until evidence actually exists.

Local acceptance demonstrates only that the reference artifacts agree with one another. It is not independent interoperability proof.

## Promotion gate — v0.1

v0.1 is reserved for the first public release candidate that passes all three unaffiliated tests:

1. **Independent consumer.** An implementation in another language parses every valid reference package and reproduces normalized output, diagnostics, fixed-time freshness, and headline lineage.
2. **Independent producer.** Using only public materials, the implementer authors a new Public Equity Research package that the reference validator accepts.
3. **Ten-minute Core author.** A first-time author creates the minimal Core package in ten minutes or less.

If any task needs private clarification, that attempt does not qualify. The ambiguity must be resolved publicly in a new immutable release candidate, and the clean-room test restarts.

Completed results remain author-claimed until a named public reviewer checks their immutable evidence. The rc.1 validator cannot certify independence or promote itself; reviewed evidence supports the decision to publish a new immutable candidate as v0.1.

Promotion would support a clean-room implementability and interoperability claim only. It would not establish adoption, independent financial review, lineage completeness, or financial correctness.

## First post-v0.1 milestone — real-model adoption

After format interoperability is demonstrated, recruit an external design partner to publish and maintain a real public-equity model. This milestone should measure:

- time to publish and validator repair burden;
- structural coverage of headline outputs;
- successful rendering by multiple independent consumers;
- meaningful reader inspection of sources, assumptions, lineage, and native artifacts; and
- stale-input remediation through a new immutable release.

The milestone should not be folded into v0.1. It tests market demand, real-data maintenance, authoring friction, and presentation quality rather than the format's clean-room implementability.

## Subsequent work tracks

### Authoring and conversion

Develop optional templates, recipes, agent skills, workbook adapters, and repair tools that produce the same valid off.json. Measure whether a first-time analyst can publish quickly without losing structural coverage.

### Lifecycle and refresh

Monitor declared freshness outside structural conformance, identify affected headline outputs, help authors issue new immutable releases, and compare versions. The key product metric is stale-input remediation rate.

### Publishing and inspection

Explore accessible mobile web, native-file inspection, documents, PDFs, embeds, and immutable citations through non-normative renderers. Cross-render evidence belongs to the post-v0.1 adoption milestone.

### Specification maintenance

Publish ambiguities, compatibility fixes, and new release candidates through a public change process. Preserve deterministic normalized output and backward-compatible extension handling.

## Deferred boundaries

- Presentation standardization and renderer metadata are illustrative and deferred.
- Execution, formula graphs, spreadsheet calculation, and interactive recalculation are deferred.
- Social networks, feeds, comments, reputation, discovery, and registry behavior are deferred.
- Adoption claims are pending external real-model use and are not part of rc.1 conformance.
- Other asset-class profiles, independently reviewed lineage, private permissions, governance, monetization, brokerage connectivity, and automated recommendations are deferred.
- XBRL processing is deferred; rc.1 includes only an illustrative evidence locator.
