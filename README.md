# Open Finance Format

Open Finance Format (OFF) is an open standard for publishing financial models as portable, versioned, source-backed research objects.

**Publish the model, not just the spreadsheet.**

This repository contains the experimental v0.1-rc.1 interoperability candidate. It does not claim independent implementation, promotion to v0.1, adoption, or financial correctness.

The mutable development tree also implements the optional
[Workbook Binding 0.1](spec/profiles/workbook-binding-0.1.md) profile. It binds
neutral subjects to authored XLSX locators after Core verifies immutable local
snapshot bytes. Google Sheets may appear only as an inert remote descriptor.
This post-rc.1 work is not a new release candidate and does not alter the frozen
`release/v0.1-rc.1/` evidence.

## Normative contract

Read the normative documents in this order:

1. [OFF Core 0.1](spec/OFF-Core-0.1.md) — package identity, releases, resources, profiles, and integrity.
2. [OFF Public Equity Research 0.1](spec/profiles/public-equity-research-0.1.md) — Traceable public-equity entities, freshness, and author-declared lineage.
3. [Workbook Binding 0.1](spec/profiles/workbook-binding-0.1.md) — post-rc.1 immutable XLSX snapshot and authored-locator bindings.
4. [Normalization 0.1](spec/normalization-0.1.md) — admission and canonical normalized output.
5. [Diagnostics 0.1](spec/diagnostics-0.1.md) — stable errors, warnings, and ordering.
6. [Conformance 0.1](spec/conformance-0.1.md) — offline evaluation, stage gates, outcomes, and clean-room promotion.
7. [Rule registry](spec/rules-0.1.json) — authoritative stage and diagnostic assignment for every rule.

The sole normative package source is off.json. Templates, generators, narrative documents, spreadsheets, and other resources may help authors, but they do not override the manifest or define conformance.

## Profiles and scope

v0.1-rc.1 defines exactly two normative profiles:

- OFF Core 0.1, which every OFF package must satisfy.
- OFF Public Equity Research 0.1, an optional declared profile whose highest claim is **Traceable — author-declared lineage**.

The Traceable claim reports structural conformance separately from an author's completeness attestation. It is not independent review, exact computational reproduction, or proof that the underlying research is correct.

The development Workbook Binding profile's exact claim is **Bound —
author-declared workbook locators**. It does not inspect workbook contents,
verify locator existence or cell values, parse formulas, recalculate, or compare
a live Google Sheet with its local snapshot.

OFF conformance does not execute spreadsheet formulas, recalculate models, make network requests, render a publishing site, operate a social network, or make investment recommendations. Presentation conventions are illustrative; execution, social behavior, and adoption requirements are deferred.

The [XBRL source-locator note](spec/examples/xbrl-source-locator.md) is illustrative only. It shows how an OFF source may point to opaque XBRL evidence without importing XBRL processing or creating an XBRL conformance claim.

## Repository contents

The candidate currently includes:

- normative specification text, JSON Schemas, and a stable rule registry;
- reference evaluator source for Core and the Public Equity Research profile;
- a [layered offline conformance corpus](conformance/corpus.json) with one finance-agnostic Core package, one synthetic Traceable package evaluated at fixed current and stale timestamps, one Workbook Binding Google-snapshot package, focused invalid fixtures, and a required binding to the separate evaluator-failure vector;
- a [host-independent evaluator-failure vector](conformance/evaluator-failures.json) and closed [failure-envelope schema](schemas/evaluator-failure-0.1.schema.json);
- hand-reviewed canonical normalized results and expected diagnostic codes; and
- clean-room promotion requirements that keep every external evidence field pending until an unaffiliated implementer completes the public tasks.

The corpus proves the behavior of this reference implementation under local tests. It does not by itself prove that an independent consumer will interpret OFF the same way.

## Local verification

Contributor runtime:

- Node.js 22.13.0 or newer within the Node 22 line;
- pnpm 10.34.1; and
- ESM modules.

The local acceptance commands are:

    pnpm install --frozen-lockfile
    pnpm check
    pnpm test
    pnpm build
    pnpm test:node22
    pnpm test:offline
    pnpm release:self-check

The offline development path uses the checked-in dist/off.mjs bundle and local public artifacts. Its corpus command verifies all eleven package cases and every bound evaluator-failure vector case, requires no dependency installation, and must make no network request:

    node dist/off.mjs corpus verify --corpus conformance/corpus.json

Running local checks does not satisfy the external consumer, producer, or ten-minute authoring gates.

`pnpm release:self-check` uses the development checkout's verifier code to
materialize and validate the pinned rc.1 Git source snapshot. It authenticates
that snapshot against the frozen rc.1 allowlist and checksums, and compares the
current `release/v0.1-rc.1/**` bytes with the pinned snapshot. Frozen-tree drift
fails with `OFF-REL-FROZEN-DRIFT`; do not regenerate the frozen checksums to
bless it. The command is still a
self-check, not authentication of the verifier checkout. To validate a
candidate that has not yet been trusted, first authenticate a separate verifier
checkout through its immutable public commit and independently published
checksum-manifest digest. Keep that verifier outside the candidate root, then
invoke it by absolute path:

    node /absolute/path/to/authenticated-off-verifier/scripts/release-validate.mjs --root /absolute/path/to/untrusted-candidate

The trusted verifier reads candidate artifacts through `--root`; it does not import candidate scripts or dependencies. Never install dependencies or run tooling from an untrusted candidate merely to authenticate it.

The pinned rc.1 commit must exist in the local Git object database. A shallow
clone that omits it fails deterministically with
`OFF-REL-PINNED-COMMIT-MISSING`; fetch full history explicitly (for example,
`git fetch --unshallow`) and rerun the self-check. The validator never fetches
history or makes another network request on its own.

`pnpm test:offline` adds a JavaScript regression guard around the dependency-free corpus run. It blocks the network-capable module and global acquisition paths covered by the harness probes, including global and `node:process` access to `getBuiltinModule` and `node:module`/`createRequire`. This guard is not an operating-system security sandbox. Every harness child has a fixed 30-second deadline. On POSIX, an overrun requests `SIGKILL` for the supervised process group; on Windows it terminates the direct child. Inherited pipes are closed so the deadline fails promptly, but a process that deliberately detaches into another group is outside this harness's cleanup guarantee. The Node 22 corpus check uses the same bounded behavior.

## Promotion boundary

Promotion from v0.1-rc.1 to v0.1 remains blocked on publicly reviewed evidence from an unaffiliated implementer:

1. an independent consumer in another language reproduces normalized output, diagnostics, lineage, and fixed-time freshness;
2. an independent producer authors a new conforming package using only public materials; and
3. a first-time author creates the minimal Core package in ten minutes or less.

Any ambiguity that needs private clarification must be resolved publicly in a new immutable release candidate, after which the clean-room test restarts.

The rc.1 release validator checks local artifact consistency only. It cannot certify independence or promote an in-place candidate; reviewed evidence informs publication of a new immutable candidate.

## Authority and history

- [STRATEGY.md](STRATEGY.md) defines product identity and strategic boundaries.
- The documents under spec/ define the current v0.1-rc.1 contract.
- [docs/START_HERE.md](docs/START_HERE.md) routes earlier planning material to current authority.
- [docs/handoff.yaml](docs/handoff.yaml) records the candidate status and pending evidence.

The repository is licensed under Apache-2.0. The checked-in bundle's third-party components retain their upstream terms in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). A package's declared license describes that package; validation does not prove identity, ownership, or legal rights.
