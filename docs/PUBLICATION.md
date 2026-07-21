# Publishing OFF v0.1-rc.1

This is a non-normative maintainer procedure for publishing the experimental OFF v0.1-rc.1 candidate. It describes delivery evidence; it does not modify the candidate’s conformance semantics or turn local validation into an interoperability claim.

The candidate’s release closure and clean-room rules remain authoritative in [the rc.1 release guide](../release/v0.1-rc.1/README.md). The source package contract remains `off.json` plus the two normative profiles described in the repository [README](../README.md).

## What publication establishes

Publication can establish a public candidate location, a protected immutable tag, a separately authenticated checksum-manifest digest, and evidence that the reference checks ran for a particular revision. It does **not** establish independent interoperability, independent review, adoption, financial correctness, or promotion to v0.1.

The immutable rc.1 candidate must retain all embedded external-evidence fields as `pending`. Do not alter `release/v0.1-rc.1/checksums.json`, the embedded interoperability template, or any normative artifact to record hosted-build, public-anchor, or clean-room results.

## Publication procedure

1. Run the documented local acceptance matrix from a clean shipping commit. This establishes internal consistency only.
2. Publish the repository history to a public GitHub repository and record the full shipping commit SHA.
3. Create the annotated `v0.1-rc.1` tag only after the shipping commit is public. Before pushing it, configure a GitHub tag ruleset for `refs/tags/v0.1-rc.1` that blocks updates and deletion with no bypass actors. An emergency correction is a new candidate, not a rewritten tag.
4. From the tagged tree, calculate the SHA-256 of `release/v0.1-rc.1/checksums.json`. Publish the digest in a public GitHub Gist created by the authenticated maintainer account. The Gist revision must record only the repository URL, full commit SHA, tag, publication time, and checksum-manifest SHA-256. Record the returned immutable Gist revision URL in the GitHub release metadata after creation. This separate authenticated record is required before inviting clean-room work; the GitHub release body is not a substitute.
5. Connect the repository to CircleCI and run the exact tag build. The `acceptance` job declares no context or write credential; before treating the build as trustworthy, confirm that the CircleCI project has no injected environment variables or contexts. Its artifacts retain corpus validation, release validation, and a provenance record for the built commit/ref, tool versions, command outcomes, and output digests. Cite CI as release evidence only when that record identifies `revision.tag` as exactly `v0.1-rc.1`.
6. Create the GitHub release only after the public anchor, authenticated digest record, and hosted-CI state are known. Link the release closure, exact Gist revision, and CircleCI build or state why activation was unavailable. Cite a successful CircleCI build only when its provenance records `revision.tag` as exactly `v0.1-rc.1`; branch or pull-request builds are not release evidence. State explicitly that this remains an experimental rc.1 candidate and that clean-room evidence is pending.

## Clean-room handoff

Give an unaffiliated implementer the immutable public commit/tag and the authenticated checksum digest, then use the [consumer task](../clean-room/CONSUMER_TASK.md) and [producer task](../clean-room/PRODUCER_TASK.md). A request for private clarification ends the attempt: publish the clarification in a new immutable candidate and restart the clean-room exercise from public materials.

Do not treat a green CircleCI build as a clean-room pass. It verifies the project’s own local reference behavior and release closure for the built revision; only the unaffiliated consumer, producer, and timed authoring exercises can supply the distinct evidence needed for a future promotion decision.
