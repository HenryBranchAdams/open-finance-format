# Open Finance Format v0.1-rc.1

Status: experimental interoperability release candidate.

An authenticated immutable checkout of this candidate is the release root. The candidate supplies a language-neutral specification, schemas, reference packages, expected canonical output, stable diagnostics, a dependency-free reference CLI, and clean-room tasks. It is not v0.1 and carries no independent interoperability, adoption, or financial-correctness claim.

`THIRD_PARTY_NOTICES.md` preserves the upstream license notices for dependencies included in the single-file CLI bundle.

## Release closure

files.json is the sorted allowlist for the candidate's public runtime, build source, specification, schema, corpus, clean-room, and release artifacts. Release validation rejects:

- missing or unlisted files in a closed release directory;
- unsafe, case-ambiguous, non-regular, or symlinked allowlist paths;
- stale, malformed, or incomplete checksums;
- candidate-label drift;
- a checked-in dist/off.mjs that differs from a fresh build; and
- any attempted in-place label change from v0.1-rc.1 to v0.1.

These are mechanical closure checks. The validator does not establish that an implementer is independent, that private guidance was absent, or that linked evidence is authentic and sufficient. Even syntactically complete self-attestation cannot clear the promotion diagnostic; reviewed evidence must inform publication of a new candidate.

checksums.json records SHA-256 digests over raw bytes for every allowlisted file except itself. The allowlisted `.gitattributes` forces LF checkout bytes for repository text, independent of a contributor's `core.autocrlf` setting. This is drift detection, not publisher authentication. The checksum file cannot authenticate its own origin.

At publication, the publisher must bind this candidate to an immutable public VCS commit and publish the checksum-manifest digest through an independent authenticated channel. Those two authentication anchors remain pending in this local candidate. A completed interoperability report records them; the pending template does not pretend they exist.

## Offline verification

The dependency-free bundle verifies the complete corpus with no package installation:

    node dist/off.mjs corpus verify --corpus conformance/corpus.json

Structural conformance must make no network request. The corpus command evaluates each case twice, parses each expected JSON file, reserializes it under RFC 8785/JCS, and compares the no-LF canonical payload bytes and diagnostic fields. The expected file's final LF is repository text-file hygiene, not semantic payload.

`conformance/evaluator-failures.json` separately fixes a host-independent evaluator-configuration failure. Clean-room consumers compare its exact structured failure value under `schemas/evaluator-failure-0.1.schema.json`; it is not a package result and has no canonical normalized package bytes.

Contributor acceptance from the candidate checkout:

    pnpm install --frozen-lockfile
    pnpm build
    pnpm check
    pnpm test
    pnpm test:node22
    pnpm test:offline
    pnpm release:self-check

The release validator must return ok: true while explicitly reporting these items as pending:

- public VCS commit;
- checksum-manifest digest;
- independent alternate-language consumer;
- independent producer;
- ten-minute first-time Core author; and
- adoption.

Local success proves only internal consistency among the candidate artifacts.

`pnpm release:self-check` trusts this checkout's verifier code and dependencies. It is a self-check, not authentication of this checkout. For an untrusted candidate, first authenticate a separate verifier checkout using its immutable public commit and checksum-manifest digest, keep it outside the candidate root, and run:

    node /absolute/path/to/authenticated-off-verifier/scripts/release-validate.mjs --root /absolute/path/to/untrusted-candidate

That trusted verifier reads the candidate through `--root` and must not import candidate scripts or dependencies. Do not install dependencies or execute tooling from the untrusted candidate as part of authentication.

The JavaScript network guard exercised by `pnpm test:offline` is a regression guard, not an operating-system security sandbox. Its probes cover direct network-module imports, global and `node:process` access to `getBuiltinModule`, and `node:module`/`createRequire`. Each offline child and the Node 22 corpus invocation has a fixed 30-second deadline. On POSIX the harness requests `SIGKILL` for the supervised process group; on Windows it terminates the direct child. It closes inherited pipes so an overrun fails promptly, but deliberately detached descendants are outside this JavaScript harness's cleanup guarantee.

## Clean-room sequence

1. Publish the candidate checkout at one immutable public commit.
2. Publish the SHA-256 digest of release/v0.1-rc.1/checksums.json through an authenticated channel independent of the archive.
3. Give an unaffiliated implementer the immutable public materials and [consumer task](../../clean-room/CONSUMER_TASK.md).
4. Freeze and compare the implementer's normalized bytes, diagnostics, freshness, lineage, and evaluator-failure-vector evidence.
5. Give the implementer the [producer task](../../clean-room/PRODUCER_TASK.md), including the separate timed Core-authoring exercise. The producer may not inspect `src/` or reverse-engineer `dist/off.mjs` for authoring guidance.
6. Freeze the distinct Traceable package's complete bytes and digests before its first reference-validator invocation. A structural rejection is failed evidence, not an invitation to repair the package from implementation diagnostics and claim a pass; record separately whether it reflects author error or public-contract ambiguity.
7. Record results in a public copy of the [interoperability report template](../../clean-room/INTEROPERABILITY_REPORT.template.md). Label completed evidence `author-claimed` until a named public human reviewer verifies the immutable evidence.

The independent consumer must use another programming language. The producer must author a distinct Traceable Public Equity package rather than modify a reference fixture.

If the implementer needs private clarification, stop the attempt. Publish the clarification in a new immutable release candidate, regenerate its closure and checksums, and restart both clean-room tasks from public materials. v0.1-rc.1 is never silently patched after publication.

The rc.1 automated validator can detect inconsistent or incomplete local release metadata, but it cannot certify clean-room evidence or promote the candidate. Promotion to v0.1 remains a public human-review decision followed by publication of a new immutable candidate. Every external evidence value in rc.1 remains pending.

## Scope

The normative source for every package is off.json. OFF Core 0.1 and OFF Public Equity Research 0.1 are the only normative profiles in this candidate. XBRL source-location metadata is illustrative and not evaluated. Presentation, execution, recalculation, social behavior, multi-renderer publishing, real-company adoption, and independently reviewed lineage remain outside this release.
