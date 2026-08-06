# Clean-room qualification launchpad

This document describes the local, non-normative handoff prepared for the
frozen v0.1-rc.1 candidate. It makes a clean-room attempt easier to stage
without changing the candidate or claiming that local work is independent
evidence.

The launchpad is deliberately outside clean-room/ and
release/v0.1-rc.1/. Those trees are closed by the release validator. The
launchpad never edits the pending interoperability report in the candidate.

## What it does

tools/qualification-launchpad.mjs accepts:

- an authenticated, clean checkout rooted at the candidate's immutable public
  commit;
- the explicitly supplied full commit SHA; and
- the explicitly supplied SHA-256 digest of
  release/v0.1-rc.1/checksums.json.

It verifies the checkout identity, clean status, candidate allowlist, frozen
pending authentication fields, and checksum-manifest digest. It then creates a
new attempt directory outside the candidate repository containing copies of the
candidate release metadata, consumer and producer tasks, the pending report
template, a non-normative ordered sequence, and a machine-readable launchpad
manifest.

The supplied commit must equal the `pinned_git_snapshot` in the launchpad
authority checkout's `docs/handoff.yaml`; a self-consistent alternate allowlist,
checksum set, or later mutable commit cannot silently become the candidate.
Every non-self-excluded allowlisted file is hashed before any copy, and the
copied required bytes come from those verified buffers.

The command performs no implementation, validator run, network operation,
publication, recruitment, credential use, or external evidence mutation.
Local preflight is not public authentication. The generated manifest keeps
public authentication, independence, all three promotion gates, and public
review pending.

## Usage

From a trusted checkout of the mutable development repository, after obtaining
the required public anchors through their separately authenticated channels:

    node tools/qualification-launchpad.mjs \
      --candidate-root /absolute/path/to/clean-candidate-checkout \
      --public-commit <40-character-commit-sha> \
      --checksum-manifest-sha256 <64-character-sha256> \
      --output /absolute/path/to/new-attempt-directory \
      --created-at <whole-second-UTC-timestamp>

The output directory must not exist, its direct parent must already exist, and
it must be outside the candidate repository. The creation timestamp is an
explicit evidence input and must identify a real whole-second UTC instant. The
command refuses pending anchors, a dirty candidate checkout, commit or digest
mismatches, modified candidate authentication fields, and unsafe output paths.
It never overwrites an attempt directory.

The generated candidate/ files and tasks/ files are copied from the
authenticated candidate checkout. The copied report remains a template; a
completed attempt report belongs outside the candidate and must preserve
author-claimed versus publicly reviewed states.

## Participant packet

The copied release metadata identifies the exact candidate label, allowlist,
and checksum manifest. Give the participant the candidate checkout and digest
record through the authenticated public channels before handing over the
packet. The consumer and producer task files are the authority for eligibility,
relationship disclosure, language and source restrictions, clean workspace and
network expectations, freeze timing, no-repair producer semantics, evaluator
failure handling, ambiguity handling, and required output evidence. This
launchpad's sequence and manifest are convenience coordination material and
link back to those authorities; they do not add OFF conformance rules.

The participant must keep immutable outputs, diagnostics, timestamps,
inventories, digests, runtime and command records, implementation metadata,
and any ambiguity or failed attempt together. The reference evaluator is an
opaque comparison tool only at the stage allowed by the task. A result is not
passed until a named public human reviewer checks the immutable evidence.

## Ordered handoff

1. A trusted coordinator verifies the immutable public commit and checksum
   digest through the required authenticated channels.
2. An eligible unaffiliated implementer receives only the authenticated public
   candidate materials and the consumer task.
3. The consumer freezes alternate-language normalized bytes, diagnostics,
   freshness, lineage, and evaluator-failure evidence before any reference
   comparison.
4. The producer and timed Core-authoring exercises follow their separate
   pre-validation freeze and timing rules.
5. A copied interoperability report records author-claimed evidence while the
   rc.1 template remains all-pending.
6. A named public human reviewer checks the immutable evidence before any
   promotion decision.

## Coordinator and reviewer runbook

The coordinator should:

1. Authenticate the public VCS commit and checksum-manifest digest independently
   of this local launchpad, and record the exact immutable URLs or state as
   external evidence. If either anchor is pending or unavailable, stop before
   recruitment or a qualifying attempt.
2. Check eligibility and relationship disclosures, give only the authenticated
   candidate materials and canonical task files, and keep each participant's
   attempt in a separate immutable path.
3. Collect the first consumer outputs before reference comparison and the
   producer's pre-validation freeze, first validator results, repairs, and
   evaluator/environment failures. Preserve failed attempts and ambiguity logs.
4. Copy the report template for the attempt, set only participant claims to
   `author-claimed`, and keep public authentication, independence, review, and
   promotion states pending until their evidence exists.
5. Publish or otherwise preserve the evidence path without modifying rc.1;
   route public-contract ambiguity to a new candidate and restart the attempt.

The public reviewer should independently inspect the candidate anchors, the
participant relationship and public-materials-only attestations, byte
inventories and digests, first-result and no-repair rules, command/runtime
records, diagnostics, and every claim-state transition. The reviewer records a
named public review against the immutable evidence path. Local automation,
repository tests, a local rehearsal, a configured CI workflow, or an agent
cannot create that review or set independence.

The launchpad cannot create an unaffiliated implementer or public reviewer.
Local rehearsals, local Git objects, green CI, and repository tests remain
non-qualifying evidence.

## Verification boundary

The launchpad's focused tests prove fail-closed staging and deterministic
scaffolding. They do not prove public reachability, publisher authentication,
independent interoperability, adoption, financial correctness, or promotion.
Run the repository's documented offline corpus and full verification gates
separately, and record unavailable runtime or cold-checkout evidence rather
than treating it as passed.

For a copied attempt report, use the read-only campaign evidence checker to
validate the canonical machine-readable record before publishing it:

    node tools/qualification-evidence.mjs \
      --report /absolute/path/to/attempt/report.md \
      --source-kind external-attempt

Use `--source-kind local-rehearsal` only for a mechanics rehearsal. That mode
rejects any populated authentication, independence, or qualifying gate state.
The checker never edits a report and cannot create public authentication,
independence, public review, or promotion evidence.

The machine record is deliberately closed and literal. A successful consumer
claim records `evaluatorFailureVectorsReproduced` as `reproduced`. A successful
producer claim records `packageBytesFrozenBeforeValidation` as `confirmed`,
both first validator results as `pass`, and `postValidationRepairs` as `0`.
The timed Core claim uses a finite nonnegative numeric duration no greater than
600 seconds. Publicly reviewed states use `reviewed` and require a non-empty
reviewer plus immutable review-evidence path. Pending and inapplicable gates
cannot contain populated qualifying evidence.

The frozen rc.1 independence record has one `evidencePath` rather than a
separate review-path field. When independence becomes `publicly-reviewed` or
`failed`, that path must identify the immutable record containing both the
participant attestations and the named public review. Authentication and gate
records use their separate `reviewEvidencePath` fields.
