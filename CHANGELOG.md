# Changelog

All notable public changes to Open Finance Format are recorded here.

## Unreleased development snapshot

### Added

- Optional Workbook Binding 0.1 profile for byte-verified local XLSX snapshots,
  neutral semantic subjects, authored A1 locators, and inert Google Sheets
  descriptors.
- Profile schema, six stable semantic diagnostics, deterministic normalized
  payload, focused tests, and a Google-snapshot conformance package.
- Explicit frozen-versus-development specification index, normative
  terminology, compatibility/versioning policy, offline schema-resource
  contract, and consolidated security/privacy considerations.
- Founder-led public governance, OFF Change Proposal and immutable decision
  record templates, contribution and conduct policies, and honest security
  intake guidance.
- Closed machine-readable protocol and schema catalogs with deterministic CLI
  discovery, plus a Core-only initializer that computes entrypoint integrity
  metadata and refuses existing targets.
- Read-only GitHub pull-request CI, pinned third-party actions, dependency
  update configuration, and structured issue and pull-request intake.

### Release boundary

- `v0.1-rc.1` remains frozen and unchanged. Development builds use a separate
  explicit input manifest, while `release:self-check` authenticates the pinned
  rc.1 Git snapshot against the existing rc.1 checksums.
- This snapshot makes no rc.2, v0.1, spreadsheet-execution, live-source,
  financial-correctness, or independent-interoperability claim.
- The mutable reference package is labeled `0.1.0-dev`; the pinned rc.1 Git
  snapshot retains its original package identity and bytes.

## v0.1-rc.1 — 2026-07-17

Status: experimental interoperability release candidate.

### Added

- The normative OFF Core 0.1, Public Equity Research 0.1, normalization, diagnostics, and conformance contracts.
- Draft 2020-12 input and normalized-result JSON Schemas plus the authoritative rule registry.
- A dependency-free ESM reference CLI and deterministic canonical evaluation primitive.
- A layered offline corpus with one finance-agnostic Core package, one synthetic Traceable Public Equity package evaluated at fixed current and stale timestamps, focused invalid fixtures, and hand-reviewed expected results.
- A sorted public release allowlist, SHA-256 drift manifest, local release validator, and clean-room consumer and producer tasks.
- A non-normative XBRL evidence-locator example.

### Claim boundary

- The highest Public Equity claim is Traceable — author-declared lineage.
- Structural conformance does not establish financial correctness, exact spreadsheet execution, source truth, legal rights, or independent review.
- The public VCS commit anchor, checksum-manifest digest, independent consumer, independent producer, ten-minute Core-authoring evidence, and adoption evidence remain pending.
- Promotion to v0.1 requires public unaffiliated evidence, named human review, and a new immutable candidate; rc.1 automated validation cannot certify promotion.
- The distinct Traceable producer package must be frozen before its first reference-validator use. A structural rejection is failed evidence, not an implementation-guided repair path; the report distinguishes author error from public-contract ambiguity.
- Any completed evidence remains author-claimed until public human review. Any private clarification requires a new immutable release candidate and a restarted clean-room attempt.
