# Project brief

## Product thesis

Open Finance Format (OFF) is an open standard for publishing financial models as portable, versioned, source-backed research objects. It addresses the loss of structure and provenance that occurs when analysts publish only a workbook, PDF, screenshot, or short social post.

Spreadsheets can remain the authoring tool. OFF supplies an open publishing layer that binds a release to stable identity, resources, assumptions, outputs, sources, lineage, freshness, and canonical normalized results.

## Primary user

The primary user is an independent public-markets analyst or serious FinTwit/FinX investor who builds models in spreadsheets and publishes investment theses publicly. OFF should let that analyst create a credible, inspectable artifact without building a website or reducing the work to screenshots.

Readers and agents are secondary users. They should be able to inventory a package, verify local resource integrity, inspect headline-output lineage, evaluate freshness at a fixed timestamp, cite an immutable release, and compare compatible normalized results.

## Current product boundary

The current deliverable is the experimental v0.1-rc.1 interoperability candidate. Its purpose is to test whether public specification text, schemas, fixtures, and an offline conformance corpus are sufficient for independent consumption and production.

v0.1-rc.1 makes no claim of promotion to v0.1, adoption, financial correctness, independent lineage review, or exact spreadsheet execution.

The mutable post-rc.1 development tree adds an optional Workbook Binding 0.1
consumer. It binds neutral subjects to authored A1 locators only after Core
verifies immutable local XLSX bytes. A live Google Sheet is descriptor metadata
and remains `notEvaluated`. This work does not change rc.1 or create a new
candidate.

The sole normative package source is off.json. Human-readable narrative, spreadsheet bindings, authoring templates, generators, viewers, and renderer metadata are optional or illustrative and cannot override the manifest.

## Normative profiles

v0.1-rc.1 has exactly two normative profiles:

1. **OFF Core 0.1.** Package and release identity, authorship, licensing declarations, declared profiles, resource inventory, local and remote locations, media types, roles, hashes, relationships, and integrity rules.
2. **OFF Public Equity Research 0.1.** Security identity, scenarios, units, stable assumptions and outputs, sources, fixed-time freshness, material dependency edges, and **Traceable — author-declared lineage**.

Core remains finance-agnostic. A generic Core consumer can identify, resolve, integrity-check, inventory, and normalize the research object without understanding public-equity semantics.

Traceable means the validator can check structural coherence, reference resolution, terminal source or assumption designations, artifact-hash bindings, and deterministic freshness propagation. Lineage completeness remains an author attestation and is not independently verified.

## Executable interoperability contract

The [layered conformance corpus](../conformance/corpus.json) contains:

- one minimal Core package with off.json and one local entrypoint resource;
- one synthetic Public Equity Research package evaluated at fixed timestamps that produce current and stale states;
- focused invalid fixtures for admission, path safety, integrity, lineage, and attestation boundaries; and
- hand-reviewed expected canonical normalized results and diagnostic codes.

Conformance evaluation is offline. Remote resources may be declared as descriptors, but their reachability and integrity are not evaluated. If content is required to determine meaning under a claimed profile, it must be available locally.

## XBRL relationship

XBRL is useful evidence infrastructure, but it is not a v0.1-rc.1 semantic dependency. The [illustrative XBRL source locator](../spec/examples/xbrl-source-locator.md) shows how a namespaced extension can point from an OFF source fact to opaque local XBRL evidence. OFF still requires the value, unit, effective date, source, freshness rule, and lineage edge explicitly in off.json.

An XBRL processor, taxonomy resolver, fact verifier, calculation checker, or XBRL-specific conformance corpus would require a future optional profile.

## Product principles

1. **Open before hosted.** A package remains useful in a repository, filesystem, archive, or static host.
2. **Files before APIs.** No proprietary API, SDK, viewer, or runtime is required for conformance.
3. **One normative authority.** off.json determines package conformance.
4. **Immutable releases.** Stable release identity and hashes support inspection and citation.
5. **Deterministic semantics.** Equivalent interpretations produce byte-comparable canonical JSON.
6. **Freshness is evaluated, not guessed.** Fixed timestamps make current and stale results reproducible.
7. **Qualified lineage.** Structural checks never turn an author's completeness assertion into independent certification.
8. **Conformance is not correctness.** Validation cannot decide whether inputs are true or an investment thesis is sound.
9. **Standard and platform remain separable.** Competing tools can implement the same public contract.

## Deferred work

- Presentation conventions and renderer metadata remain illustrative and deferred from normative conformance.
- Execution, formula graphs, interactive recalculation, and editable models are deferred.
- Social feeds, comments, reputation, discovery, registries, and challenge workflows are deferred.
- Adoption and multi-renderer publishing evidence are pending a post-v0.1 external design-partner milestone.
- Other asset classes, independently reviewed lineage, private permissions, brokerage connectivity, and investment recommendations are deferred.

## Success measures

The earliest product metric is time to publish without sacrificing structural coverage. Longer-term measures include cross-render success, meaningful inspection, stale-input remediation, semantic citation, and maintained immutable releases.

Those are product and adoption measures, not v0.1-rc.1 conformance requirements. The immediate release bar is narrower: a public clean-room consumer and producer must implement the same contract without private clarification, a first-time author must create the minimal Core package in ten minutes or less, and a named public reviewer must verify the immutable evidence before it supports a new candidate.
