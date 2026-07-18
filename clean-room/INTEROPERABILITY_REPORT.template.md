# OFF interoperability report template

Copy this template for a public clean-room attempt. Do not modify the pending template inside the immutable candidate.

Every evidence value in this rc.1 template remains pending. In a copied attempt report, a completed but unreviewed result must be labeled `author-claimed`; it must not be labeled passed until a named public human reviewer has checked the linked immutable evidence. Automated release validation checks candidate consistency only and cannot certify interoperability or authorize promotion.

## Candidate authentication

- Candidate: v0.1-rc.1
- Immutable public VCS commit: pending
- SHA-256 of release/v0.1-rc.1/checksums.json: pending
- Authenticated publication channel: pending
- Allowlist and checksum verification: pending

Archive-local checksums detect drift but do not authenticate the publisher. Reviewers must verify the public VCS commit and checksum-manifest digest through an independent authenticated channel before relying on the attempt.

## Independence

- Implementer name or stable pseudonym: pending
- Relationship to OFF authors: pending
- Unaffiliated-implementer attestation: pending
- Public-materials-only attestation: pending
- Confirmation of no prior private guidance: pending
- Confirmation that `src/` was not inspected for implementation guidance: pending
- Confirmation that `dist/off.mjs` was not reverse-engineered for implementation guidance: pending
- Consumer implementation language and version: pending
- Repository and immutable evidence commit: pending
- Evidence claim basis: pending
- Public human review status, reviewer, and evidence path: pending

## Consumer results

- Every corpus case evaluated twice: pending
- Every evaluator-failure vector evaluated twice: pending
- Exact evaluator-failure values reproduced: pending
- Exact canonical normalized bytes reproduced: pending
- Ordered diagnostics reproduced: pending
- Fixed-time freshness reproduced: pending
- Resolved lineage reproduced: pending
- Network-free evaluation confirmed: pending
- Evidence path: pending
- Evidence claim basis: pending
- Public human review status, reviewer, and evidence path: pending

## Producer results

- Distinct Traceable Public Equity package published: pending
- Reference validator structural result: pending
- Current and stale fixed-time results recorded: pending
- Package ID: pending
- Pre-validation package bytes frozen: pending
- Freeze timestamp, inventory, and digest evidence: pending
- First current-timestamp validator result: pending
- First stale-timestamp validator result: pending
- Post-validation repair count: pending
- Evidence path: pending
- Evidence claim basis: pending
- Public human review status, reviewer, and evidence path: pending

## Ten-minute Core-authoring results

- First-time author eligibility confirmed: pending
- Start and stop evidence: pending
- Duration in seconds: pending
- Final package and validator output: pending
- Evidence path: pending
- Evidence claim basis: pending
- Public human review status, reviewer, and evidence path: pending

## Ambiguity log

List every point where the public specification, schemas, corpus, or expected results were insufficient. Include the affected rule and whether work stopped.

Any private clarification requires a new immutable release candidate and a complete restart; it cannot be counted as a pass for this candidate.

## Claim boundary

- Clean-room interoperability: pending
- Adoption or real-model use: pending and not tested by these tasks
- Financial correctness: not evaluated
- Independent lineage completeness: not evaluated
- Automated promotion certification: not provided
- Public human review and new-candidate promotion decision: pending

## Machine-readable status record

Keep this record synchronized with the reviewed evidence. Local rc.1 release validation requires every evidence, review, and authentication value below to remain pending. In a copied attempt report, set a gate's `status` and `claimBasis` to `author-claimed` when the implementer reports completion; leave its `publicHumanReview` fields pending. Only a named public human reviewer may record a passed or failed review with an immutable evidence path. Even a fully reviewed record is input to a public decision to publish a new release candidate; the automated validator cannot promote rc.1 to v0.1.

The immutable rc.1 candidate also requires the embedded record to remain in the exact checked-in two-space JSON serialization. This rejects duplicate member names and other textual ambiguity before the complete pending value is compared. A copied public attempt report is external evidence and is not validated as an in-place mutation of rc.1.

<!-- OFF-INTEROPERABILITY-RECORD-BEGIN
{
  "recordVersion": "0.1",
  "candidate": "v0.1-rc.1",
  "authentication": {
    "publicVcsCommit": "pending",
    "checksumManifestSha256": "pending",
    "claimBasis": "pending",
    "publicHumanReview": "pending",
    "reviewer": "pending",
    "reviewEvidencePath": "pending"
  },
  "independence": {
    "status": "pending",
    "unaffiliatedImplementer": "pending",
    "relationshipDisclosure": "pending",
    "publicMaterialsOnly": "pending",
    "noPrivateGuidance": "pending",
    "sourceCodeNotInspected": "pending",
    "distributionNotReverseEngineered": "pending",
    "claimBasis": "pending",
    "publicHumanReview": "pending",
    "reviewer": "pending",
    "evidencePath": "pending"
  },
  "gates": {
    "independentConsumer": {
      "status": "pending",
      "implementationLanguage": "pending",
      "evaluatorFailureVectorsReproduced": "pending",
      "evidencePath": "pending",
      "claimBasis": "pending",
      "publicHumanReview": "pending",
      "reviewer": "pending",
      "reviewEvidencePath": "pending"
    },
    "independentProducer": {
      "status": "pending",
      "packageId": "pending",
      "packageBytesFrozenBeforeValidation": "pending",
      "firstCurrentValidatorResult": "pending",
      "firstStaleValidatorResult": "pending",
      "postValidationRepairs": "pending",
      "evidencePath": "pending",
      "claimBasis": "pending",
      "publicHumanReview": "pending",
      "reviewer": "pending",
      "reviewEvidencePath": "pending"
    },
    "tenMinuteCoreAuthoring": {
      "status": "pending",
      "durationSeconds": "pending",
      "evidencePath": "pending",
      "claimBasis": "pending",
      "publicHumanReview": "pending",
      "reviewer": "pending",
      "reviewEvidencePath": "pending"
    },
    "adoption": {
      "status": "pending",
      "evidencePath": "pending",
      "claimBasis": "pending",
      "publicHumanReview": "pending",
      "reviewer": "pending",
      "reviewEvidencePath": "pending"
    }
  }
}
OFF-INTEROPERABILITY-RECORD-END -->
