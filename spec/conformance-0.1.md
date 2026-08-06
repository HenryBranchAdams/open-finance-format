# OFF Conformance 0.1

Status: experimental normative development contract after `v0.1-rc.1`. The
frozen candidate is determined by its pinned Git snapshot; this mutable copy
also includes post-rc.1 Workbook Binding stages and claims.

## 1. Evaluation primitive

The evaluator accepts an owned, quiescent unpacked package directory, an explicit evaluation timestamp, and requested profile URIs. Concurrent attacker-writable trees are outside rc.1 and must be snapshotted by an embedding host.

The public result is a discriminated union:

- `packageResult` contains the normalized in-memory value and canonical bytes for valid, valid-with-warning, and invalid packages.
- `evaluatorFailure` contains a stable `OFF-Txxxx` code and sanitized operation context, with no package verdict, package diagnostics, or canonical bytes.

A readable root missing `off.json` is package-invalid. Permission failures, configured reference safety limits, short reads, concurrent mutation, and internal faults are evaluator failures.

The rc.1 evaluator-failure codes are:

| Code | Meaning |
|---|---|
| `OFF-T1001` | A configured reference safety limit prevented evaluation. |
| `OFF-T1002` | A sanitized host-I/O failure prevented evaluation. |
| `OFF-T1003` | A short read or concurrent resource mutation was detected. |
| `OFF-T1004` | Invalid evaluator configuration or an internal invariant prevented evaluation. |

Failure context contains only a stable operation token and, when safe and applicable, an admitted resource ID and declared package-relative path. It never contains an absolute path, raw operating-system error, stack trace, or host-specific identifier.

The rc.1 operation-token vocabulary is exhaustive:

| Code | Allowed `operation` tokens |
|---|---|
| `OFF-T1001` | `resourceLimit` |
| `OFF-T1002` | `rootAccess`, `directoryRead`, `resourceStat`, `resourceOpen`, `resourceRead`, `resourceClose` |
| `OFF-T1003` | `resourceMutation` |
| `OFF-T1004` | `configuration`, `internal` |

An input that does not supply a non-empty package root, a whole-second UTC `evaluatedAt` value, a list of unique absolute requested-profile URIs, or the required input types is invalid evaluator configuration. The evaluation primitive returns exactly `{"kind":"evaluatorFailure","code":"OFF-T1004","operation":"configuration"}` before package I/O. The CLI may reject the same malformed command line as usage before invoking the evaluation primitive.

The public [evaluator-failure vector](../conformance/evaluator-failures.json) fixes this host-independent boundary case. Its configuration case names a lexically safe package-root sentinel that MUST be absent from the published corpus. The corpus verifier MUST invoke the public evaluation primitive without first stating, calling `realpath` on, or otherwise reading that sentinel; lexical path resolution is permitted. Consequently, an evaluator that performs package I/O before rejecting the invalid configuration produces `OFF-T1002` instead of the exact expected `OFF-T1004` object and fails the vector. A vector whose configuration would permit package I/O remains subject to the normal contained-path, directory, and symlink defenses before invocation.

The layered corpus descriptor binds that vector through its required `evaluatorFailures` reference, so `off corpus verify --corpus conformance/corpus.json` evaluates both the package cases and the evaluator-failure cases. Every entry is evaluated twice through the public evaluation primitive. Its expected value conforms to [Evaluator Failure 0.1](../schemas/evaluator-failure-0.1.schema.json), and the two actual values must be identical before the first is compared exactly with the expected object. Evaluator failures are not package results and have no normalized package bytes.

## 2. Offline rule

Structural conformance MUST make no network request. The evaluator MUST NOT invoke DNS, sockets, HTTP clients, child processes, remote schema loaders, or URI dereferencing. All claimed-profile meaning is present in `off.json` and local resources. Remote descriptors are inventory only and report `notEvaluated`.

### 2.1 Reference safety profile

The rc.1 reference evaluator reads files through bounded descriptors and compares file and directory identity before and after security-sensitive work. It admits at most 16 MiB of `off.json` bytes and scans at most 100,000 package-root entries while locating the exact manifest name. The public corpus harness admits at most 1 MiB each for `corpus.json` and its evaluator-failure vector, and 16 MiB for each package expectation document. Exceeding one of these ceilings is `OFF-T1001`; the evaluator MUST check the declared size before allocating the corresponding buffer.

Local-resource defaults are 256 MiB per resource, 1 GiB cumulatively, 4,096 path bytes, 128 path segments, 100,000 directory entries cumulatively, and 64 KiB read chunks. A configured chunk size MUST NOT exceed the hard 16 MiB allocation cap. The directory-entry budget is cumulative across one evaluation, and a verified directory inventory is cached by stable directory identity so revisiting it neither rescans nor rebudgets its entries.

An unexpected host read, stat, open, close, or directory-enumeration failure is sanitized as `OFF-T1002`. A short read, path disappearance after precheck, identity replacement, or pre/post metadata change is `OFF-T1003` with a stable mutation operation. Neither failure becomes a package diagnostic, and neither may expose an absolute path or host error text.

## 3. Stage gates

| Stage | Prerequisite | Failure effect |
|---|---|---|
| Admission | Readable `off.json` bytes | Stop before schema evaluation. |
| Schema | Admitted JSON | Stop before Core semantic checks. |
| Requested profile target | Admitted JSON whose true root shape is readable | Evaluate caller-required profile URIs independently of Core. A target error makes the requested package result invalid but does not prevent Core semantic checks or force Core status to fail. |
| Core | Core schema passed | Stop before optional profile semantics. |
| Workbook Binding | Core passed and profile requested | Retain its payload only when schema, snapshot-resource, and reference checks pass. |
| Public Equity | Core passed and profile requested | Omit resolved lineage and freshness if graph checks fail. |
| Freshness | Coherent profile graph | Emit warnings; never structural errors. |
| Canonical output | A `packageResult` value | Serialize under Normalization 0.1. Serialization failure is `evaluatorFailure`. |

Within a stage, the evaluator follows [rules-0.1.json](rules-0.1.json), reports independent violations, and suppresses rules whose prerequisites failed. The registry's `request` stage is request-scoped and non-gating: it may run alongside the manifest pipeline after its root-shape prerequisite, and its diagnostics participate in the overall outcome without changing the independently derived Core status or retention stage.

## 4. Claims

Core conformance is independent of optional profile support. Every declared and requested profile is reported as `passed`, `failed`, or `notEvaluated`. An unknown declared profile does not invalidate Core. If the caller requires an unsupported profile, the package result is invalid for that request while the Core result may remain passed.

Public Equity `passed` means only `Traceable — author-declared lineage`, with structural conformance and attested completeness reported separately. OFF never certifies investment quality, source truth, legal ownership, exact spreadsheet execution, or complete computational reproduction.

Workbook Binding `passed` means only `Bound — author-declared workbook
locators`. The evaluator proved that Core verified the referenced local XLSX
snapshot bytes and that profile shapes and references are coherent. It did not
inspect workbook contents, prove locator or cell existence, execute formulas,
recalculate, fetch a live source, or compare a live Google Sheet with the
snapshot. Workbook Binding and Public Equity rows evaluate independently after
Core passes.

## 5. Corpus and release candidates

The corpus descriptor MUST contain at least one package case. The current
development corpus contains one finance-agnostic Core package, one synthetic
Traceable Public Equity package evaluated at fixed current and stale timestamps,
one Workbook Binding package with a local XLSX snapshot and inert Google
descriptor, a small boundary-focused diagnostic set, and the separately stored
host-independent evaluator-failure vector bound by `corpus.json`. Expected
normalized values, diagnostic fields, and evaluator-failure objects are
hand-reviewed public artifacts. The complete dependency-free command verifies
all eleven package cases plus every bound evaluator-failure case from a fresh
checkout with no dependency installation or network access. The frozen rc.1
candidate remains the earlier ten-case corpus authenticated by its unchanged
release checksums.

`corpusResult` is a closed deterministic summary with exactly `kind`, `ok`, `corpusVersion`, `cases`, and `evaluatorFailureCases`. `cases` reports package-case outcomes only. `evaluatorFailureCases` reports exact evaluator-failure matches only and never carries a package outcome. `ok` is true only when every entry in both arrays passed. The offline release check compares this complete nested value against descriptor-derived evidence: the exact corpus version; ordered package IDs, `passed` statuses, and expected outcomes; and ordered evaluator-failure IDs, `passed` statuses, and exact expected failure objects. Extra top-level or nested fields fail the check; matching counts alone are insufficient.

Each checked-in expectation `.json` is a repository document containing one exact RFC 8785 normalized-result payload followed by one LF. The LF belongs to the repository document envelope, not to the canonical output. The verifier parses the document, proves that the pre-LF payload is already canonical, canonicalizes the parsed value, and compares those no-LF bytes to the evaluator's `packageResult.canonicalBytes`. The expectation file itself MUST NOT be described or consumed as canonical output bytes.

Public artifacts begin at `v0.1-rc.1`. Private clarification invalidates a clean-room attempt: OFF publishes the clarification in a new immutable candidate and the test restarts from public materials.

Promotion to `v0.1` requires:

1. an unaffiliated consumer in another language that reproduces normalized results, diagnostics, lineage, and fixed-time freshness;
2. an unaffiliated producer package accepted by the reference validator; and
3. evidence that a first-time author creates the minimal Core package from public instructions in ten minutes or less.

Passing these gates supports an interoperability claim only. Adoption, independent financial review, real-company publishing, renderers, social features, execution, and XBRL processing remain outside this release.
