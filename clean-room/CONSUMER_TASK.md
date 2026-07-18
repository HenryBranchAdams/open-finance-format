# Clean-room consumer task

## Purpose

Determine whether an unaffiliated implementer can consume Open Finance Format v0.1-rc.1 from public materials only and reproduce its semantic results without private guidance from OFF's authors.

This is an interoperability test, not a financial review or adoption study.

## Eligibility and isolation

- Implement the consumer in another programming language, not JavaScript, TypeScript, Node.js, or a wrapper around dist/off.mjs.
- Use the immutable public VCS commit, its published checksum-manifest digest, and files listed in release/v0.1-rc.1/files.json.
- Build from the normative specifications, schemas, rule registry, corpus, and expected results.
- Do not use src/ or reverse-engineer dist/off.mjs as implementation guidance. The reference CLI may be run only after the independent outputs are frozen for comparison.
- Do not ask OFF's authors for private conventions, examples, or interpretations.
- Make no network request during package conformance evaluation.

## Required implementation

Build a consumer that accepts an unpacked package directory, an explicit whole-second UTC evaluation timestamp, and requested profile URIs. It must:

1. admit off.json under the published JSON and canonicalization rules;
2. evaluate OFF Core 0.1, including safe local resolution and raw-byte integrity;
3. evaluate OFF Public Equity Research 0.1 when requested;
4. resolve deterministically ordered dependent-to-dependency lineage;
5. calculate leaf and propagated headline freshness at the supplied timestamp;
6. emit stable normalized diagnostics without implementation-native messages; and
7. serialize the normalized result as exact canonical normalized bytes.

Do not execute spreadsheet formulas, fetch remote resources, interpret XBRL, or infer undeclared semantics.

## Corpus procedure

For every case in conformance/corpus.json:

1. use the declared package, requested profiles, and evaluatedAt timestamp;
2. evaluate the case twice and require byte-identical output;
3. parse the declared expected JSON, reserialize it under RFC 8785/JCS, and compare the resulting no-LF canonical payload bytes;
4. compare the complete ordered diagnostic records, not only human descriptions; and
5. record the implementation version, language runtime, command, exit status, and output digest.

Separately evaluate every case in `conformance/evaluator-failures.json` through the same public evaluation primitive. Compare the complete `evaluatorFailure` value to `expected` under `schemas/evaluator-failure-0.1.schema.json`. These cases do not produce a package verdict or canonical normalized bytes. A command-line front end may reject malformed CLI syntax as usage, so this vector must exercise the evaluation primitive rather than a CLI argument parser.

The evidence must demonstrate:

- the minimal Core package remains finance-agnostic;
- the same immutable Public Equity package produces the expected current and stale results at the exact fixed-time boundary;
- resolved lineage matches the expected deterministic edge order;
- valid, valid-with-warnings, invalid, and the separately published evaluator-failure vector remain distinct; and
- no output contains an absolute host path, stack trace, wall-clock timestamp, or network-derived state.

## Cross-run evidence

Freeze the alternate-language canonical normalized bytes before invoking the reference CLI. Then run:

    node dist/off.mjs corpus verify --corpus conformance/corpus.json

The repository expected files end with one LF for text-file hygiene. That final LF is not semantic and is not part of the canonical payload returned by the evaluation primitive. Publish a case-by-case comparison containing canonical-payload SHA-256 digests, exact diagnostic equality, freshness equality, lineage equality, and any implementation notes. A summary saying only that tests passed is insufficient.

## Ambiguity rule

If any required behavior cannot be derived from public materials, stop and record the exact public text, fixture, or expected result that is ambiguous. Do not obtain a private answer.

Any private clarification invalidates this attempt. OFF must publish the resolution in a new immutable release candidate, and an unaffiliated implementer must restart the task from that candidate's public materials.

## Completion bar

The consumer gate passes only when an unaffiliated alternate-language implementation reproduces every required canonical byte sequence, diagnostic, freshness state, and lineage result without private clarification. Completion supports clean-room implementability only; it does not prove adoption or financial correctness.
