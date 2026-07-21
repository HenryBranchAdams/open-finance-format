---
module: OFF release conformance and promotion
date: 2026-07-18
problem_type: architecture_pattern
component: testing_framework
severity: high
applies_when:
  - "A release candidate ships its own validator or conformance suite"
  - "Interoperability depends on behavior reproduced by an unaffiliated implementation"
  - "Local artifact consistency could be mistaken for external proof"
  - "Promotion requires public evidence that automation cannot certify"
related_components:
  - documentation
  - development_workflow
  - tooling
tags:
  - conformance
  - clean-room
  - interoperability
  - release-candidate
  - evidence-boundary
  - claim-discipline
  - self-validation
---

# Separate local conformance from clean-room interoperability

## Context

An experimental format can overstate what its own validator demonstrates. OFF needs repeatable evidence that its specification, schemas, normalized representation, fixtures, evaluator, and release artifacts agree, but those artifacts all come from the same project. The repository therefore limits the local claim: the corpus proves the reference implementation's behavior under local tests, not that an independent consumer will interpret OFF identically (`README.md:37-46`).

The resulting architecture is a claim ladder rather than one undifferentiated “conformance passed” badge. Normative semantics define equivalent interpretation; the layered conformance corpus tests the reference evaluator against that meaning; release closure detects internal artifact drift; and separate clean-room gates establish whether the public materials are sufficient for unaffiliated consumers and producers.

## Guidance

Use four evidence layers, and name the claim proved by each one.

### 1. Define language-neutral semantics before publishing golden files

Give every evaluation an explicit context and a closed result envelope. OFF records the specification and normalizer versions, fixed evaluation timestamp, requested profiles, outcome, and diagnostics in each package result. Evaluator failures remain a separate result kind without normalized package bytes (`spec/normalization-0.1.md:7-13`).

Canonical ordering excludes host-local and implementation-specific state (`spec/normalization-0.1.md:48-65`). RFC 8785 serialization then requires byte-identical output from correct implementations given the same admitted package and evaluation context (`spec/normalization-0.1.md:169-171`). This normalized result—not reference implementation internals—is the cross-language comparison target.

### 2. Exercise the contract with an offline layered conformance corpus

Bind positive, warning, invalid, and evaluator-failure boundaries to fixed inputs and exact expected results. OFF's package corpus includes a finance-agnostic Core case, one immutable Public Equity package evaluated on both sides of its freshness boundary, and focused invalid cases (`conformance/corpus.json:1-104`). Evaluator failures have a separate vector because they are tool results rather than package verdicts; the configuration vector requires the exact `OFF-T1004` failure before package I/O (`conformance/evaluator-failures.json:1-16`; `spec/conformance-0.1.md:30-40`).

Evaluate every package case and evaluator-failure vector twice and compare the complete expected value, not merely counts or exit status (`spec/conformance-0.1.md:36-40`, `spec/conformance-0.1.md:74-80`). Keep structural evaluation network-free so remote descriptors cannot make a package's meaning depend on network state (`spec/conformance-0.1.md:42-52`).

### 3. Close the release without confusing drift detection with authentication

Use a sorted allowlist and complete checksums to bind the candidate's public runtime, source, specification, schemas, corpus, clean-room tasks, and release artifacts. OFF's release checks reject missing or unlisted files in closed directories, unsafe paths, stale checksums, candidate-label drift, and a checked-in bundle that differs from a fresh build (`release/v0.1-rc.1/README.md:9-18`). The implementation traverses closed roots for unlisted files (`scripts/release-validate.mjs:572-597`), recalculates expected checksums (`scripts/release-validate.mjs:673-727`), and rebuilds the distribution when the release inputs are safe to inspect (`scripts/release-validate.mjs:729-748`).

These checks prove mechanical closure and internal consistency. They do not authenticate the checksum file, the checkout, or its publisher (`release/v0.1-rc.1/README.md:20-24`). A self-check also trusts the verifier code and dependencies in the checkout being checked, so OFF explicitly treats it as internal consistency rather than authentication (`README.md:72-76`).

### 4. Keep clean-room evidence separate and pending until public review

Do not let a locally valid report or green self-check turn external evidence into “passed.” The release validator initializes the public anchors, independent consumer, independent producer, timed authoring, and adoption fields as pending (`scripts/release-validate.mjs:54-61`). It requires the rc.1 interoperability record to remain the exact pending template (`scripts/release-validate.mjs:640-670`) and returns local validity alongside the separate evidence projection (`scripts/release-validate.mjs:750-757`). The handoff makes the same distinction between implemented local artifacts and pending external evidence (`docs/handoff.yaml:35-69`).

Promotion is a new evidence event, not a relabeling of local success. It requires an unaffiliated alternate-language consumer to reproduce normalized results and diagnostics, an unaffiliated producer to author a distinct accepted package, and a first-time author to complete the minimal Core package within ten minutes (`README.md:80-90`). If a task requires private clarification, publish the resolution in a new immutable candidate and restart the clean-room attempt (`clean-room/CONSUMER_TASK.md:60-68`; `clean-room/PRODUCER_TASK.md:72-78`).

## Why This Matters

This separation prevents circular evidence. A reference implementation can show that it agrees with its own public vectors. It cannot independently demonstrate that the prose and schemas expose every convention another implementation needs. The consumer task tests semantic portability; the producer task tests whether the contract is authorable without fixture-specific knowledge.

It also keeps integrity, authenticity, and interoperability distinct. An allowlist, reproducible bundle, and checksum manifest can expose drift. Separate public anchors establish provenance. Only unaffiliated implementation and production attempts can supply clean-room evidence, and only named public review can change author-claimed results into reviewed evidence (`clean-room/INTEROPERABILITY_REPORT.template.md:1-15`, `clean-room/INTEROPERABILITY_REPORT.template.md:85-89`).

Session history reinforces the boundary: an early timeout-harness check killed its direct child but left a spawned descendant alive long enough to trigger a sentinel. Repairing that harness strengthened local evidence, but it could not turn the project's own verifier into an independent implementation. This is why containment checks, deterministic corpus results, and clean-room interoperability remain different kinds of assurance. *(Session history.)*

Finally, the pattern constrains product claims. Even completed clean-room gates would support implementability and interoperability—not adoption, financial correctness, exact spreadsheet execution, or independently reviewed lineage (`README.md:82-90`; `clean-room/INTEROPERABILITY_REPORT.template.md:76-83`).

## When to Apply

Apply this pattern when:

- a project publishes a specification and reference implementation together;
- canonical outputs or diagnostics should match across programming languages;
- evaluation must derive meaning from fixed local inputs without network access;
- generated or bundled release artifacts can drift from their source;
- the same organization authors the specification, validator, and golden fixtures; or
- adoption, correctness, safety, provenance, and interoperability claims must remain distinct.

The pattern is especially important for experimental release candidates. Local checks should be strong enough to reject internal inconsistency, while their result shape and release metadata make it difficult to mistake local readiness for completed clean-room evidence.

## Examples

| Evidence observed | Supported statement | Unsupported leap |
|---|---|---|
| Exact normalized bytes, diagnostics, and evaluator-failure objects match twice for every local vector | “The reference evaluator matches the published corpus under the fixed contexts.” | “Independent implementations interpret OFF equivalently.” |
| The dependency-free corpus completes without network-derived semantics | “The published reference behavior is locally reproducible from versioned artifacts.” | “The JavaScript guard is an operating-system sandbox.” OFF explicitly disclaims that (`README.md:78`). |
| Release allowlist, checksums, candidate label, and rebuilt distribution agree | “The candidate is mechanically closed and internally consistent.” | “The candidate's publisher and origin are authenticated.” |
| External consumer, producer, and timed-authoring fields remain pending | “The candidate is ready to begin clean-room testing.” | “Interoperability or adoption has been demonstrated.” |

The same package can test a semantic boundary without creating a second release. The Public Equity package is evaluated at `2026-07-17T23:59:59Z` and again at `2026-07-18T00:00:00Z`, producing fixed current and stale expectations from identical package bytes (`conformance/corpus.json:15-23`, `conformance/corpus.json:35-43`). That is strong local evidence for deterministic freshness. It becomes interoperability evidence only when an unaffiliated implementation reproduces the results from the public contract.

Similarly, a passing release-validation result has two parallel fields: `ok` reports whether local release diagnostics are empty, while `evidence` reports the clean-room gates independently (`scripts/release-validate.mjs:750-757`). The honest summary is: **local conformance proof can establish readiness for the external test; it cannot substitute for the external test.**

## Related

- `README.md:35-90`
- `spec/conformance-0.1.md:30-90`
- `release/v0.1-rc.1/README.md:9-79`
- `clean-room/CONSUMER_TASK.md:1-68`
- `clean-room/PRODUCER_TASK.md:1-78`
- `clean-room/INTEROPERABILITY_REPORT.template.md:1-89`
