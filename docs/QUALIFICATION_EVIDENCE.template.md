# External qualification evidence submission template

Copy this document outside the candidate checkout for one participant and one
attempt. It is a submission form, not evidence by itself. Keep the candidate's
`clean-room/INTEROPERABILITY_REPORT.template.md` unchanged and synchronize its
machine-readable record only in a copied external report.

Use the exact immutable pointers in the [qualification index](QUALIFICATION_INDEX.md).
Do not replace an immutable digest with a mutable branch URL. Do not label an
author submission `publicly-reviewed`; the named reviewer makes that state
transition in a separate review record.

## Submission identity

- Candidate tag: `v0.1-rc.1`
- Candidate target commit: `pending`
- Checksum-manifest SHA-256: `pending`
- Participant role: `consumer` / `producer` / `timed-core-author`
- Implementer name or stable pseudonym: `pending`
- Relationship to the format authors: `pending`
- Public evidence path or immutable URL: `pending`
- Evidence commit or archive digest: `pending`
- Submission date and timezone: `pending`

## Independence attestations

Complete these for a clean-room participant, with a citation to the immutable
record supporting each statement:

| Field | Value | Evidence path |
| --- | --- | --- |
| Unaffiliated implementer | `pending` | `pending` |
| Relationship disclosure | `pending` | `pending` |
| Public materials only | `pending` | `pending` |
| No private guidance | `pending` | `pending` |
| Reference source not inspected for implementation guidance | `pending` | `pending` |
| Distribution not reverse-engineered for authoring guidance | `pending` | `pending` |

## Consumer submission

Complete only for the alternate-language consumer gate:

- Implementation language and version: `pending`
- Evaluator interface and command: `pending`
- Runtime and operating-system details: `pending`
- Corpus cases evaluated twice: `pending`
- Case-level canonical output digests: `pending`
- Ordered diagnostic equality: `pending`
- Fixed-time freshness equality: `pending`
- Resolved-lineage equality: `pending`
- Evaluator-failure vectors reproduced exactly: `pending`
- Network-free evaluation record: `pending`
- Frozen-before-reference-comparison timestamp: `pending`
- Ambiguity or failed-attempt log: `pending`
- Immutable evidence path: `pending`

The machine record may use `evaluatorFailureVectorsReproduced: reproduced`
only when the complete vector evidence is present. The gate remains
`author-claimed` until a named reviewer checks the evidence.

## Producer submission

Complete only for the distinct Public Equity package:

- New package identifier: `pending`
- Package-tree inventory and raw-file SHA-256 digests: `pending`
- Pre-validation freeze timestamp: `pending`
- Package-tree digest: `pending`
- First current-timestamp validator command and result: `pending`
- First stale-timestamp validator command and result: `pending`
- Post-validation repairs: `pending`
- Distinctness from reference package identities, values, prose, and bytes: `pending`
- Public-materials-only and no-private-guidance record: `pending`
- Canonical normalized outputs, diagnostics, freshness, and lineage: `pending`
- Immutable evidence path: `pending`

For a successful author claim, the machine record requires
`packageBytesFrozenBeforeValidation: confirmed`, both first validator results
to be `pass`, and `postValidationRepairs: 0`. A repaired result cannot replace
the first result.

## Ten-minute Core-author submission

Complete separately from the producer submission:

- First-time-author eligibility: `pending`
- Timer start evidence: `pending`
- Timer stop evidence: `pending`
- Duration in seconds: `pending`
- Attempt log and validator outputs: `pending`
- Final package inventory and digest: `pending`
- Immutable evidence path: `pending`

The canonical machine record accepts a finite nonnegative duration and only a
reviewed gate can establish whether it is at or below 600 seconds.

## Claim-state handoff

| State | Who may record it | Meaning |
| --- | --- | --- |
| `pending` | Anyone preserving an incomplete record | No claim is made |
| `author-claimed` | Participant/coordinator in a copied report | Participant reports completed evidence; public review is still pending |
| `independently-executed` | Coordinator after checking the execution record | Execution and independence evidence are present; review is still pending |
| `publicly-authenticated` | Coordinator after independently verifying the candidate anchors | Authentication claim basis only; it is not a participant gate or public human review |
| `publicly-reviewed` | Named public human reviewer | The linked immutable evidence was checked against the review boundary |
| `failed` | Named public human reviewer | Reviewed evidence does not satisfy the stated gate; preserve the failure |

Candidate authentication is represented by `authentication.claimBasis:
publicly-authenticated`, the exact public commit and checksum digest, and the
required review fields. It is not represented by a gate `status` of
`publicly-reviewed`; a reviewer adds `authentication.publicHumanReview:
reviewed` only after checking the coordinator's anchor record.

Run the evidence checker against the copied report before handoff:

    node tools/qualification-evidence.mjs \
      --report /absolute/path/to/attempt/report.md \
      --source-kind external-attempt

The checker validates state consistency. It does not authenticate a publisher,
create independent execution, select a reviewer, establish adoption, or decide
whether a new release should be published.
